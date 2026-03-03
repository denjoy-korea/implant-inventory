ALTER TABLE inventory_audits
  ADD COLUMN IF NOT EXISTS performed_by TEXT;
