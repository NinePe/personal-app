-- ============================================================
-- PROJECTIONS MODULE — Monthly fixed income / expense planner
-- ============================================================
-- Grid-shaped:
--   rows = fixed line items (Sueldo, Casa, Cuota TC, ...)
--   cols = (year, month) pairs
-- Net per month = SUM(income rows) - SUM(expense rows).
--
-- Special row: Cuota TC → is_auto=true, amount is computed at
-- query time from credit-card billing cycles (my portion only).

CREATE TABLE IF NOT EXISTS spending.projection_lines (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text          NOT NULL CHECK (kind IN ('income', 'expense')),
  name        text          NOT NULL,
  sort_order  int           NOT NULL DEFAULT 0,
  is_auto     boolean       NOT NULL DEFAULT false,
  auto_source text          NULL,   -- e.g. 'credit_cards_my_portion'
  created_at  timestamptz   DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spending.projection_values (
  id       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id  uuid          NOT NULL REFERENCES spending.projection_lines(id) ON DELETE CASCADE,
  year     int           NOT NULL,
  month    int           NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount   numeric(12,2)  NOT NULL DEFAULT 0,
  UNIQUE (line_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_projection_values_year ON spending.projection_values(year, month);

-- ── Seed default lines (based on user's Excel) ──────────────
INSERT INTO spending.projection_lines (kind, name, sort_order, is_auto, auto_source)
SELECT * FROM (VALUES
  ('income',  'Sueldo',          1,  false, NULL::text),
  ('income',  'Adelanto',        2,  false, NULL),
  ('income',  'Pago Ray',        3,  false, NULL),
  ('income',  'Pago Giusseppi',  4,  false, NULL),
  ('income',  'Bonos',           5,  false, NULL),
  ('income',  'Aguinaldo',       6,  false, NULL),
  ('expense', 'Casa',            10, false, NULL),
  ('expense', 'Arriendo',        11, false, NULL),
  ('expense', 'Cuota TC',        12, true,  'credit_cards_my_portion'),
  ('expense', 'Servicios',       13, false, NULL),
  ('expense', 'Prestamo 1',      14, false, NULL),
  ('expense', 'Junta 200',       15, false, NULL),
  ('expense', 'Cobertec',        16, false, NULL),
  ('expense', 'Renta sla',       17, false, NULL),
  ('expense', 'AFP',             18, false, NULL),
  ('expense', 'Seguro',          19, false, NULL),
  ('expense', 'Transporte',      20, false, NULL),
  ('expense', 'Comida',          21, false, NULL),
  ('expense', 'Viajes Trux',     22, false, NULL),
  ('expense', 'Gastos Extras',   23, false, NULL),
  ('expense', 'Separacion 1',    24, false, NULL),
  ('expense', 'Prestamos',       25, false, NULL),
  ('expense', 'Adelanto Egreso', 26, false, NULL)
) AS v(kind, name, sort_order, is_auto, auto_source)
WHERE NOT EXISTS (SELECT 1 FROM spending.projection_lines LIMIT 1);
