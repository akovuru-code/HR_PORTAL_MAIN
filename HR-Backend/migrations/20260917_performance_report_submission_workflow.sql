-- Additive draft, version-history, locking, and Root Admin replacement workflow.
-- Existing performance reports remain intact and are backfilled as version 1.
ALTER TABLE employee_performance_reports
  ALTER COLUMN submitted_at DROP NOT NULL;

ALTER TABLE employee_performance_reports
  DROP CONSTRAINT IF EXISTS employee_performance_reports_status_check;
ALTER TABLE employee_performance_reports
  ADD CONSTRAINT employee_performance_reports_status_valid CHECK (status IN ('DRAFT', 'SUBMITTED'));
ALTER TABLE employee_performance_reports
  ALTER COLUMN status SET DEFAULT 'DRAFT';

ALTER TABLE employee_performance_reports
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS current_version_id INTEGER NULL;

CREATE TABLE IF NOT EXISTS performance_report_versions (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES employee_performance_reports(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'superseded')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NULL,
  replaced_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_report_versions_unique UNIQUE (report_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_report_versions_active_draft_unique
  ON performance_report_versions (report_id) WHERE status = 'draft';

-- Preserve each prior final report as a first submitted version before the
-- new workflow starts creating draft and replacement versions.
INSERT INTO performance_report_versions (
  report_id, version_number, original_filename, stored_filename, storage_key,
  mime_type, file_size, status, uploaded_at, submitted_at, created_at, updated_at
)
SELECT id, 1, original_filename, stored_filename, storage_key, mime_type, file_size,
  'submitted', COALESCE(uploaded_at, created_at, NOW()), COALESCE(submitted_at, created_at, NOW()), created_at, updated_at
FROM employee_performance_reports
WHERE status = 'SUBMITTED'
ON CONFLICT (report_id, version_number) DO NOTHING;

UPDATE employee_performance_reports report
SET current_version_id = version.id,
    uploaded_at = COALESCE(report.uploaded_at, version.uploaded_at),
    locked_at = COALESCE(report.locked_at, report.submitted_at)
FROM performance_report_versions version
WHERE version.report_id = report.id
  AND version.version_number = 1
  AND report.current_version_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_performance_reports_current_version_fk') THEN
    ALTER TABLE employee_performance_reports
      ADD CONSTRAINT employee_performance_reports_current_version_fk
      FOREIGN KEY (current_version_id) REFERENCES performance_report_versions(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS performance_report_replacement_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES "Employee"(employee_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  report_id INTEGER NOT NULL REFERENCES employee_performance_reports(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  company_name_snapshot VARCHAR(255) NOT NULL,
  review_type VARCHAR(32) NOT NULL CHECK (review_type IN ('MID_YEAR', 'YEAR_END')),
  review_year INTEGER NOT NULL CHECK (review_year BETWEEN 2000 AND 2100),
  submitted_version_id INTEGER NOT NULL REFERENCES performance_report_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  replacement_version_id INTEGER NULL REFERENCES performance_report_versions(id) ON UPDATE CASCADE ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'consumed')),
  reviewed_by INTEGER NULL REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS performance_report_replacement_requests_active_unique
  ON performance_report_replacement_requests (report_id)
  WHERE status IN ('pending', 'approved');
CREATE INDEX IF NOT EXISTS performance_report_replacement_requests_employee_status
  ON performance_report_replacement_requests (employee_id, status);
