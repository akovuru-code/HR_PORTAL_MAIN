-- Root Admin and Accounts Admin may save payments without a reference number.
-- This is additive to existing payment records and preserves supplied values.
ALTER TABLE payments
  ALTER COLUMN "referenceNumber" DROP NOT NULL;
