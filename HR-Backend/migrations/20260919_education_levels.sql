-- Apply before deploying the education model/controller changes.
-- Existing free-text qualifications remain unclassified until explicitly saved.
-- No records, attachment links, or certification links are removed.
ALTER TABLE educations ADD COLUMN IF NOT EXISTS education_level VARCHAR(255);
