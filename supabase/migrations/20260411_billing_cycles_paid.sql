-- ============================================================
-- Add paid status to billing cycles
-- ============================================================
-- Tracks whether each credit-card billing cycle has been paid.
-- Unpaid cycles count against the card's available credit line;
-- paid cycles free up the line again.

ALTER TABLE spending.billing_cycles
  ADD COLUMN IF NOT EXISTS paid    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_billing_cycles_paid
  ON spending.billing_cycles(card_id, paid);
