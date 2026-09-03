-- Additive only: existing Vendors and Invoices remain valid.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "customPaymentDays" INTEGER;

CREATE TABLE IF NOT EXISTS vendor_employee_rates (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES work_client_details(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES "Employee"(employee_id) ON DELETE CASCADE,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT vendor_employee_rates_vendor_employee_unique UNIQUE (vendor_id, employee_id)
);
