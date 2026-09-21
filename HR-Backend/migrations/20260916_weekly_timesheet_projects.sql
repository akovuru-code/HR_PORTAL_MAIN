-- Additive project identity for employee/week Quick Entry submissions.
ALTER TABLE "TimesheetEntries" ADD COLUMN IF NOT EXISTS project_id INTEGER NULL REFERENCES work_client_details(id) ON DELETE RESTRICT;
ALTER TABLE timesheet_weekly_summaries ADD COLUMN IF NOT EXISTS project_id INTEGER NULL REFERENCES work_client_details(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "TimesheetEntries_project_id_idx" ON "TimesheetEntries" (project_id);
CREATE INDEX IF NOT EXISTS timesheet_weekly_summaries_project_id_idx ON timesheet_weekly_summaries (project_id);
