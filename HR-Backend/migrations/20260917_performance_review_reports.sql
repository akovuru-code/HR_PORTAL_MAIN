-- Additive performance-review storage. Existing employee, company, document,
-- payroll, invoice, and timesheet records are not changed or removed.
CREATE TABLE IF NOT EXISTS performance_review_templates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  review_type VARCHAR(32) NOT NULL CHECK (review_type IN ('MID_YEAR', 'YEAR_END')),
  review_year INTEGER NOT NULL CHECK (review_year BETWEEN 2000 AND 2100),
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_review_templates_version_unique UNIQUE (company_id, review_type, review_year, version)
);

CREATE INDEX IF NOT EXISTS performance_review_templates_lookup
  ON performance_review_templates (company_id, review_type, review_year, is_active);

CREATE TABLE IF NOT EXISTS employee_performance_reports (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES "Employee"(employee_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  company_name_snapshot VARCHAR(255) NOT NULL,
  template_id INTEGER NULL REFERENCES performance_review_templates(id) ON UPDATE CASCADE ON DELETE SET NULL,
  review_type VARCHAR(32) NOT NULL CHECK (review_type IN ('MID_YEAR', 'YEAR_END')),
  review_year INTEGER NOT NULL CHECK (review_year BETWEEN 2000 AND 2100),
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED' CHECK (status = 'SUBMITTED'),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_performance_reports_current_unique UNIQUE (employee_id, review_type, review_year)
);

CREATE INDEX IF NOT EXISTS employee_performance_reports_filters
  ON employee_performance_reports (company_id, review_year, review_type, status);
