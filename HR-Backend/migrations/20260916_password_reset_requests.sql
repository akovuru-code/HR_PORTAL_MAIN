-- Additive password-reset workflow storage. Apply through the normal database
-- migration process; it does not modify existing user passwords or delete data.
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  reviewed_by INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  reset_token_hash VARCHAR(128) NULL,
  reset_token_expires_at TIMESTAMPTZ NULL,
  reset_completed_at TIMESTAMPTZ NULL,
  email_delivery_status VARCHAR(32) NOT NULL DEFAULT 'not_sent',
  email_sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS password_reset_requests_pending_user_unique
  ON password_reset_requests (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS password_reset_requests_status_created
  ON password_reset_requests (status, created_at);

-- Preserve historical legacy edit requests while safely copying eligible
-- pending password-reset requests into the dedicated workflow.
INSERT INTO password_reset_requests (user_id, reason, status, created_at, updated_at)
SELECT u.user_id, COALESCE(er.reason, 'Legacy password reset request'), 'pending', COALESCE(er."createdAt", NOW()), NOW()
FROM edit_requests er
JOIN "Employee" e ON e.employee_id = er."employeeId"
JOIN users u ON LOWER(u.email) = LOWER(e.email)
WHERE er.request_type = 'PASSWORD_RESET_REQUEST'
  AND er.status = 'pending'
  AND u.is_active = true
  AND u.account_type <> 'root_admin'
ON CONFLICT DO NOTHING;
