-- Review and execute through the production migration process; do not run this
-- automatically. Replace :ROOT_ADMIN_EMAIL only after stakeholder approval.
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type varchar(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role varchar(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE users
SET account_type = CASE WHEN lower(role) = 'admin' THEN 'admin' ELSE 'employee' END
WHERE account_type IS NULL;

ALTER TABLE users ALTER COLUMN account_type SET NOT NULL;
ALTER TABLE users ALTER COLUMN account_type SET DEFAULT 'employee';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_account_type_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_account_type_check
      CHECK (account_type IN ('root_admin', 'admin', 'employee'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_single_root_admin
  ON users ((account_type)) WHERE account_type = 'root_admin' AND is_active = true;

-- One-time, manually reviewed designation. Do not execute until the intended
-- existing account is verified and the account's current role is understood.
-- UPDATE users SET account_type = 'root_admin', admin_role = NULL,
-- permissions = '[]'::jsonb, is_active = true WHERE email = :ROOT_ADMIN_EMAIL;
