-- Add color field to cards table
ALTER TABLE spending.cards
  ADD COLUMN IF NOT EXISTS color text DEFAULT 'purple';
