-- Additive migration for Week-view quick entry. Existing detailed timesheet
-- rows keep their current behavior and are explicitly classified as detailed.
ALTER TABLE "TimesheetEntries"
  ADD COLUMN IF NOT EXISTS entry_source VARCHAR(32) NOT NULL DEFAULT 'detailed';

UPDATE "TimesheetEntries"
SET entry_source = 'detailed'
WHERE entry_source IS NULL;

-- A system-created quick entry is unique per employee/date. It is a partial
-- index so multiple ordinary detailed entries per date remain supported.
CREATE UNIQUE INDEX IF NOT EXISTS "TimesheetEntries_weekly_quick_entry_unique"
  ON "TimesheetEntries" (employee_id, "dateKey")
  WHERE entry_source = 'weekly_quick';

CREATE TABLE IF NOT EXISTS timesheet_weekly_summaries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES "Employee"(employee_id) ON DELETE CASCADE,
  week_start VARCHAR(10) NOT NULL,
  status_report TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT timesheet_weekly_summaries_employee_week_unique UNIQUE (employee_id, week_start)
);
