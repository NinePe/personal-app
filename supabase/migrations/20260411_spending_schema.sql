-- ============================================================
-- SPENDING MODULE SCHEMA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS spending;

-- ── Banks ────────────────────────────────────────────────────
CREATE TABLE spending.banks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  logo_url    text,
  created_at  timestamptz DEFAULT now()
);

-- ── Cards (credit + debit) ────────────────────────────────────
CREATE TABLE spending.cards (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,                            -- alias/apodo
  type                text        NOT NULL CHECK (type IN ('credit','debit')),
  bank_id             uuid        REFERENCES spending.banks(id) ON DELETE SET NULL,
  last_four           text,
  holder_name         text,
  -- Only for credit cards
  credit_limit        numeric(12,2),
  available_credit    numeric(12,2),
  payment_due_day     int         CHECK (payment_due_day  BETWEEN 1 AND 31),
  billing_cycle_day   int         CHECK (billing_cycle_day BETWEEN 1 AND 31),
  is_active           boolean     DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

-- ── People master ─────────────────────────────────────────────
CREATE TABLE spending.people (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  relationship text        CHECK (relationship IN ('friend','family','coworker','organization','other')),
  email        text,
  phone        text,
  avatar_url   text,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- ── Places master ─────────────────────────────────────────────
CREATE TABLE spending.places (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  address     text,
  category    text,
  created_at  timestamptz DEFAULT now()
);

-- ── Expense categories ────────────────────────────────────────
CREATE TABLE spending.expense_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  icon        text,
  color       text,
  sort_order  int         DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ── Expense sub-categories ────────────────────────────────────
CREATE TABLE spending.expense_subcategories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid        NOT NULL REFERENCES spending.expense_categories(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  sort_order  int         DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ── Expenses ──────────────────────────────────────────────────
CREATE TABLE spending.expenses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  description      text,
  card_id          uuid        NOT NULL REFERENCES spending.cards(id),
  category_id      uuid        NOT NULL REFERENCES spending.expense_categories(id),
  subcategory_id   uuid        REFERENCES spending.expense_subcategories(id),
  place_id         uuid        REFERENCES spending.places(id),
  transaction_date date        NOT NULL DEFAULT CURRENT_DATE,
  receipt_url      text,
  receipt_type     text        CHECK (receipt_type IN ('image','pdf')),
  is_split         boolean     DEFAULT false,
  split_method     text        CHECK (split_method IN ('equal','specific','percentage')),
  notes            text,
  created_at       timestamptz DEFAULT now()
);

-- ── Expense splits ────────────────────────────────────────────
CREATE TABLE spending.expense_splits (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  uuid          NOT NULL REFERENCES spending.expenses(id) ON DELETE CASCADE,
  person_id   uuid          REFERENCES spending.people(id) ON DELETE SET NULL,
  is_me       boolean       DEFAULT false,
  amount      numeric(12,2),
  percentage  numeric(5,2)  CHECK (percentage BETWEEN 0 AND 100),
  created_at  timestamptz   DEFAULT now(),
  CONSTRAINT  split_has_person_or_me CHECK (person_id IS NOT NULL OR is_me = true)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_expenses_date          ON spending.expenses(transaction_date DESC);
CREATE INDEX idx_expenses_card          ON spending.expenses(card_id);
CREATE INDEX idx_expenses_category      ON spending.expenses(category_id);
CREATE INDEX idx_expense_splits_expense ON spending.expense_splits(expense_id);
CREATE INDEX idx_subcategories_category ON spending.expense_subcategories(category_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Banks
INSERT INTO spending.banks (name) VALUES
  ('Chase'),
  ('Bank of America'),
  ('Wells Fargo'),
  ('Citibank'),
  ('Capital One'),
  ('American Express'),
  ('Discover');

-- Categories
INSERT INTO spending.expense_categories (name, icon, color, sort_order) VALUES
  ('Dining',         'utensils',      '#f97316', 1),
  ('Travel',         'plane',         '#3b82f6', 2),
  ('Retail',         'shopping-bag',  '#8b5cf6', 3),
  ('Health',         'heart',         '#ef4444', 4),
  ('Entertainment',  'music',         '#ec4899', 5),
  ('Housing',        'home',          '#14b8a6', 6),
  ('Transport',      'car',           '#eab308', 7),
  ('Education',      'book',          '#6366f1', 8),
  ('Subscriptions',  'repeat',        '#0ea5e9', 9),
  ('Other',          'more-horizontal','#6b7280',10);

-- Sub-categories (inserted referencing category names via subquery)
INSERT INTO spending.expense_subcategories (category_id, name, sort_order)
SELECT c.id, s.name, s.sort_order
FROM spending.expense_categories c
JOIN (VALUES
  -- Dining
  ('Dining', 'Coffee',       1),
  ('Dining', 'Groceries',    2),
  ('Dining', 'Fast Food',    3),
  ('Dining', 'Delivery',     4),
  ('Dining', 'Restaurant',   5),
  ('Dining', 'Bar',          6),
  -- Travel
  ('Travel', 'Flight',       1),
  ('Travel', 'Hotel',        2),
  ('Travel', 'Car Rental',   3),
  ('Travel', 'Vacation',     4),
  -- Retail
  ('Retail', 'Clothing',     1),
  ('Retail', 'Electronics',  2),
  ('Retail', 'Home Goods',   3),
  ('Retail', 'Online',       4),
  -- Health
  ('Health', 'Pharmacy',     1),
  ('Health', 'Doctor',       2),
  ('Health', 'Gym',          3),
  ('Health', 'Dental',       4),
  -- Entertainment
  ('Entertainment', 'Movies',   1),
  ('Entertainment', 'Concerts', 2),
  ('Entertainment', 'Games',    3),
  ('Entertainment', 'Sports',   4),
  -- Housing
  ('Housing', 'Rent',          1),
  ('Housing', 'Utilities',     2),
  ('Housing', 'Maintenance',   3),
  ('Housing', 'Insurance',     4),
  -- Transport
  ('Transport', 'Gas',         1),
  ('Transport', 'Parking',     2),
  ('Transport', 'Uber/Lyft',   3),
  ('Transport', 'Public Transit',4),
  -- Subscriptions
  ('Subscriptions', 'Streaming', 1),
  ('Subscriptions', 'Software',  2),
  ('Subscriptions', 'News',      3),
  -- Other
  ('Other', 'Gifts',           1),
  ('Other', 'Donations',       2),
  ('Other', 'Miscellaneous',   3)
) AS s(category_name, name, sort_order) ON c.name = s.category_name;
