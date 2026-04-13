const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

// GET /api/spending/projections?year=2026
// Returns: { year, lines, values, autoValues }
// - lines: all projection_lines sorted
// - values: projection_values for that year (user-entered)
// - autoValues: [{ month, amount }] for rows with is_auto=true (Cuota TC etc.)
router.get('/', async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    const { rows: lines } = await db.query(
      `SELECT * FROM spending.projection_lines ORDER BY sort_order, name`
    );

    const { rows: values } = await db.query(
      `SELECT line_id, year, month, amount::float AS amount
       FROM spending.projection_values WHERE year = $1`,
      [year]
    );

    // Compute Cuota TC per month from credit-card billing cycles.
    // For each cycle whose to_date lands in the projection month, sum my portion
    // (expense_splits.is_me = TRUE) of all expenses within that cycle.
    const { rows: cuotaTcRows } = await db.query(`
      SELECT EXTRACT(MONTH FROM bc.to_date)::int AS month,
             COALESCE(SUM(sp.amount), 0)::float AS amount
      FROM spending.billing_cycles bc
      JOIN spending.cards c ON c.id = bc.card_id AND c.type = 'credit'
      LEFT JOIN spending.expenses e ON e.card_id = bc.card_id
        AND e.transaction_date BETWEEN bc.from_date AND bc.to_date
      LEFT JOIN spending.expense_splits sp ON sp.expense_id = e.id AND sp.is_me = TRUE
      WHERE EXTRACT(YEAR FROM bc.to_date) = $1
      GROUP BY EXTRACT(MONTH FROM bc.to_date)
    `, [year]);

    // Map to { line_name: { month: amount } }
    const autoByLine = {};
    const cuotaTcLine = lines.find(l => l.auto_source === 'credit_cards_my_portion');
    if (cuotaTcLine) {
      autoByLine[cuotaTcLine.id] = {};
      cuotaTcRows.forEach(r => { autoByLine[cuotaTcLine.id][r.month] = r.amount; });
    }

    res.json({ year, lines, values, autoValues: autoByLine });
  } catch (err) { err500(res, err); }
});

// PUT /api/spending/projections/value  — upsert a single cell
router.put('/value', async (req, res) => {
  const { line_id, year, month, amount } = req.body;
  if (!line_id || !year || !month)
    return res.status(400).json({ error: 'line_id, year, month are required' });
  if (month < 1 || month > 12)
    return res.status(400).json({ error: 'month must be 1-12' });

  try {
    await db.query(`
      INSERT INTO spending.projection_values (line_id, year, month, amount)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (line_id, year, month) DO UPDATE SET amount = EXCLUDED.amount
    `, [line_id, year, month, amount || 0]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

// POST /api/spending/projections/clone
// Copies all values from (srcYear, srcMonth) to (dstYear, dstMonth)
router.post('/clone', async (req, res) => {
  const { srcYear, srcMonth, dstYear, dstMonth } = req.body;
  if (!srcYear || !srcMonth || !dstYear || !dstMonth)
    return res.status(400).json({ error: 'srcYear, srcMonth, dstYear, dstMonth are required' });
  try {
    // Only clone user-editable (non-auto) rows
    await db.query(`
      INSERT INTO spending.projection_values (line_id, year, month, amount)
      SELECT pv.line_id, $3, $4, pv.amount
      FROM spending.projection_values pv
      JOIN spending.projection_lines pl ON pl.id = pv.line_id
      WHERE pv.year = $1 AND pv.month = $2 AND pl.is_auto = false
      ON CONFLICT (line_id, year, month) DO UPDATE SET amount = EXCLUDED.amount
    `, [srcYear, srcMonth, dstYear, dstMonth]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

// POST /api/spending/projections/clear-month
router.post('/clear-month', async (req, res) => {
  const { year, month } = req.body;
  if (!year || !month) return res.status(400).json({ error: 'year and month are required' });
  try {
    await db.query(`
      DELETE FROM spending.projection_values pv
      USING spending.projection_lines pl
      WHERE pv.line_id = pl.id AND pl.is_auto = false
        AND pv.year = $1 AND pv.month = $2
    `, [year, month]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

// ── Line CRUD ─────────────────────────────────────────────

// POST /api/spending/projections/lines
router.post('/lines', async (req, res) => {
  const { kind, name, sort_order } = req.body;
  if (!kind || !name) return res.status(400).json({ error: 'kind and name are required' });
  if (!['income', 'expense'].includes(kind))
    return res.status(400).json({ error: "kind must be 'income' or 'expense'" });
  try {
    const { rows: [row] } = await db.query(
      `INSERT INTO spending.projection_lines (kind, name, sort_order)
       VALUES ($1, $2, $3) RETURNING *`,
      [kind, name, sort_order ?? 99]
    );
    res.status(201).json(row);
  } catch (err) { err500(res, err); }
});

// PUT /api/spending/projections/lines/:id
router.put('/lines/:id', async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    const { rows: [row] } = await db.query(
      `UPDATE spending.projection_lines
         SET name = COALESCE($1, name),
             sort_order = COALESCE($2, sort_order)
       WHERE id = $3 RETURNING *`,
      [name ?? null, sort_order ?? null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Line not found' });
    res.json(row);
  } catch (err) { err500(res, err); }
});

// DELETE /api/spending/projections/lines/:id
router.delete('/lines/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.projection_lines WHERE id = $1 AND is_auto = false`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

module.exports = router;
