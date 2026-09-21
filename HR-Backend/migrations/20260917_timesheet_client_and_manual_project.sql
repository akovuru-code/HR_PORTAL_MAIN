-- Keep legacy project_id data intact while storing the employee-entered
-- weekly project label needed by the manual-project timesheet workflow.
ALTER TABLE timesheet_weekly_summaries
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(255) NULL;
