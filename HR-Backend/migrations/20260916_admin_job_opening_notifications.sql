CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  recipient_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  resource_type VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_notifications_job_recipient_unique UNIQUE (recipient_id, type, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS admin_notifications_recipient_unread
  ON admin_notifications (recipient_id, read_at);

-- Existing HR Admin records store their effective permission list in users.
-- Preserve every current permission while adding only recruiting:view.
UPDATE users
SET permissions = (
  SELECT jsonb_agg(permission)
  FROM (
    SELECT DISTINCT value AS permission
    FROM jsonb_array_elements_text(COALESCE(users.permissions, '[]'::jsonb))
    UNION ALL SELECT 'recruiting:view'
  ) merged
)
WHERE account_type = 'admin'
  AND admin_role = 'hr'
  AND NOT (COALESCE(permissions, '[]'::jsonb) ? 'recruiting:view');
