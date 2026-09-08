-- Additive migration for multi-invoice payment allocation. Existing Payments
-- and Invoices are intentionally left unchanged.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS vendor_id INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_allocations_payment_invoice_unique UNIQUE (payment_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS payment_allocations_payment_id_idx ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS payment_allocations_invoice_id_idx ON payment_allocations(invoice_id);
