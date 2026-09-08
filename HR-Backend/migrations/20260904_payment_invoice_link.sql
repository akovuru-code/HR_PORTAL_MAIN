-- Links future payments to their invoice while preserving existing text-only
-- payment history. Historic rows are intentionally not auto-backfilled.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_invoice_id_fkey'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
