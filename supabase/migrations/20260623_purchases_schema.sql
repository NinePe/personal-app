-- PURCHASE TRACKER SCHEMA — consumption tracking + analytics
DROP SCHEMA IF EXISTS purchases CASCADE;
CREATE SCHEMA IF NOT EXISTS purchases;

-- ── Categories (Personal Care, Food, Cleaning, etc.) ───────
CREATE TABLE purchases.categories (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name    text NOT NULL UNIQUE,
  icon    text DEFAULT 'shopping_bag',
  color   text DEFAULT '#68558d',
  sort_order int DEFAULT 0
);

-- ── Subcategories (Shampoo, Detergent, Rice, etc.) ─────────
CREATE TABLE purchases.subcategories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES purchases.categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  icon        text,
  UNIQUE(category_id, name)
);

-- ── Purchase Items ─────────────────────────────────────────
CREATE TABLE purchases.items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id   uuid NOT NULL REFERENCES purchases.subcategories(id) ON DELETE CASCADE,
  name             text NOT NULL,
  brand            text,
  size_label       text,                    -- e.g. "400ml", "1L", "500g"
  quantity         numeric(10,2) NOT NULL DEFAULT 1,
  unit             text NOT NULL DEFAULT 'unit',  -- ml, g, unit, kg, L, oz
  unit_size        numeric(10,2),           -- size per unit in base unit (e.g. 400 for 400ml)
  price            numeric(12,2) NOT NULL,
  currency         text DEFAULT 'PEN',
  store            text,
  purchase_date    date NOT NULL DEFAULT CURRENT_DATE,
  finished_date    date,                    -- when depleted
  rating           int CHECK (rating BETWEEN 1 AND 5),
  notes            text,
  receipt_url      text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ── Computed columns via view ──────────────────────────────
CREATE OR REPLACE VIEW purchases.item_stats AS
SELECT
  i.*,
  CASE WHEN i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date
    THEN (i.finished_date - i.purchase_date) ELSE NULL END AS duration_days,
  CASE WHEN i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date AND i.unit_size > 0
    THEN ROUND((i.price / NULLIF(i.finished_date - i.purchase_date, 0))::numeric, 4) ELSE NULL END AS cost_per_day,
  CASE WHEN i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date
    THEN ROUND((i.price::numeric / NULLIF(i.finished_date - i.purchase_date, 0) * 30)::numeric, 2) ELSE NULL END AS cost_per_month,
  CASE WHEN i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date AND i.unit_size > 0
    THEN ROUND((i.unit_size::numeric / NULLIF(i.finished_date - i.purchase_date, 0))::numeric, 2) ELSE NULL END AS usage_per_day
FROM purchases.items i;

-- ── Seed default categories ────────────────────────────────
INSERT INTO purchases.categories (name, icon, color, sort_order) VALUES
  ('Personal Care', 'face',       '#a078ff', 1),
  ('Food & Drinks', 'restaurant', '#60c0a0', 2),
  ('Cleaning',      'mop',        '#4da6d9', 3),
  ('Health',        'favorite',   '#ff6b8a', 4),
  ('Clothing',      'apparel',    '#ffb347', 5),
  ('Home',          'home',       '#8b9dc3', 6),
  ('Pets',          'pets',       '#c07a5a', 7),
  ('Other',         'more_horiz', '#999',     99);
