-- Expense types (Essential, Lifestyle, Savings, etc.)
CREATE TABLE IF NOT EXISTS spending.expense_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'category',
  color      TEXT NOT NULL DEFAULT '#68558d',
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link categories to an expense type
ALTER TABLE spending.expense_categories
  ADD COLUMN IF NOT EXISTS expense_type_id UUID REFERENCES spending.expense_types(id) ON DELETE SET NULL;

-- Monthly budget header (salary)
CREATE TABLE IF NOT EXISTS spending.monthly_budgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month      INT  NOT NULL CHECK (month BETWEEN 1 AND 12),
  year       INT  NOT NULL,
  salary     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year)
);

-- Which expense types are active for a given month and their %
CREATE TABLE IF NOT EXISTS spending.monthly_budget_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id       UUID NOT NULL REFERENCES spending.monthly_budgets(id)  ON DELETE CASCADE,
  expense_type_id UUID NOT NULL REFERENCES spending.expense_types(id)    ON DELETE CASCADE,
  percentage      NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE(budget_id, expense_type_id)
);

-- Seed three common expense types if none exist
INSERT INTO spending.expense_types (name, icon, color, sort_order)
SELECT * FROM (VALUES
  ('Essential',  'bolt',               '#366859', 0),
  ('Lifestyle',  'auto_awesome',       '#68558d', 1),
  ('Savings',    'energy_savings_leaf','#78565f', 2)
) AS v(name, icon, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM spending.expense_types LIMIT 1);
