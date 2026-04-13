-- ============================================================
-- LOANS MODULE — Personal interpersonal ledger
-- ============================================================
-- Each row is a single flow of money between me and another person.
-- direction = 'i_lent'     → I gave them money (they owe me)
-- direction = 'i_borrowed' → They gave me money (I owe them)
--
-- Per-person net balance:
--   SUM(CASE direction WHEN 'i_lent' THEN amount ELSE -amount END)
--   positive → they owe me that much
--   negative → I owe them abs(that)
--   zero     → settled
--
-- Repayments / micropayments are just transactions in the opposite
-- direction — no special flag needed.

CREATE TABLE IF NOT EXISTS spending.loans (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id        uuid           NOT NULL REFERENCES spending.people(id) ON DELETE CASCADE,
  direction        text           NOT NULL CHECK (direction IN ('i_lent','i_borrowed')),
  amount           numeric(12,2)  NOT NULL CHECK (amount > 0),
  description      text,
  transaction_date date           NOT NULL DEFAULT CURRENT_DATE,
  card_id          uuid           NULL REFERENCES spending.cards(id) ON DELETE SET NULL,
  created_at       timestamptz    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loans_person ON spending.loans(person_id);
CREATE INDEX IF NOT EXISTS idx_loans_date   ON spending.loans(transaction_date DESC);
