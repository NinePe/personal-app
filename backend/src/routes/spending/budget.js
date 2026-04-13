const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

// ── Expense Types ──────────────────────────────────────────────

router.get('/expense-types', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM spending.expense_types ORDER BY sort_order, name'
    );
    res.json(rows);
  } catch (e) { err500(res, e); }
});

router.post('/expense-types', async (req, res) => {
  const { name, icon, color, sort_order } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO spending.expense_types (name,icon,color,sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, icon || 'category', color || '#68558d', sort_order ?? 0]
    );
    res.json(rows[0]);
  } catch (e) { err500(res, e); }
});

router.put('/expense-types/:id', async (req, res) => {
  const { name, icon, color, sort_order } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE spending.expense_types SET name=$1,icon=$2,color=$3,sort_order=$4 WHERE id=$5 RETURNING *',
      [name, icon, color, sort_order, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { err500(res, e); }
});

router.delete('/expense-types/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM spending.expense_types WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { err500(res, e); }
});

// ── Monthly Budgets ─────────────────────────────────────────────

router.get('/monthly', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT mb.id, mb.month, mb.year, mb.salary, mb.created_at,
        COALESCE(json_agg(
          json_build_object(
            'expense_type_id', mbt.expense_type_id,
            'percentage',      mbt.percentage,
            'name',            et.name,
            'icon',            et.icon,
            'color',           et.color
          ) ORDER BY et.sort_order
        ) FILTER (WHERE mbt.id IS NOT NULL), '[]') AS types
      FROM spending.monthly_budgets mb
      LEFT JOIN spending.monthly_budget_types mbt ON mbt.budget_id = mb.id
      LEFT JOIN spending.expense_types et ON et.id = mbt.expense_type_id
      GROUP BY mb.id
      ORDER BY mb.year DESC, mb.month DESC
    `);
    res.json(rows);
  } catch (e) { err500(res, e); }
});

router.get('/monthly/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  try {
    const { rows: [mb] } = await db.query(
      'SELECT * FROM spending.monthly_budgets WHERE year=$1 AND month=$2', [year, month]
    );
    if (!mb) return res.json(null);
    const { rows: types } = await db.query(`
      SELECT mbt.expense_type_id, mbt.percentage,
             et.name, et.icon, et.color, et.sort_order
      FROM spending.monthly_budget_types mbt
      JOIN spending.expense_types et ON et.id = mbt.expense_type_id
      WHERE mbt.budget_id = $1 ORDER BY et.sort_order
    `, [mb.id]);
    res.json({ ...mb, types });
  } catch (e) { err500(res, e); }
});

router.post('/monthly', async (req, res) => {
  const { month, year, salary, types } = req.body;
  const total = (types || []).reduce((s, t) => s + parseFloat(t.percentage || 0), 0);
  if (Math.abs(total - 100) > 0.01) {
    return res.status(400).json({ error: `Percentages must sum to 100% (currently ${total.toFixed(1)}%)` });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [mb] } = await client.query(`
      INSERT INTO spending.monthly_budgets (month,year,salary)
      VALUES ($1,$2,$3)
      ON CONFLICT (month,year) DO UPDATE SET salary=EXCLUDED.salary
      RETURNING *
    `, [month, year, salary]);
    await client.query('DELETE FROM spending.monthly_budget_types WHERE budget_id=$1', [mb.id]);
    for (const t of (types || [])) {
      await client.query(
        'INSERT INTO spending.monthly_budget_types (budget_id,expense_type_id,percentage) VALUES ($1,$2,$3)',
        [mb.id, t.expense_type_id, t.percentage]
      );
    }
    await client.query('COMMIT');
    res.json(mb);
  } catch (e) {
    await client.query('ROLLBACK');
    err500(res, e);
  } finally { client.release(); }
});

// ── Trends (line chart data) ────────────────────────────────────

router.get('/trends', async (req, res) => {
  const { from, to, expense_type_id: typeId, category_id: categoryId } = req.query;
  const numMonths = Math.min(parseInt(req.query.months || '6'), 24);

  // Build date condition: explicit from/to wins over months-based window
  const dateFilter = (from && to)
    ? { clause: 'e.transaction_date BETWEEN $DATE_FROM AND $DATE_TO', from, to }
    : null;

  try {
    let rows;
    if (categoryId) {
      const params = dateFilter
        ? [categoryId, dateFilter.from, dateFilter.to]
        : [categoryId, numMonths];
      const dateCond = dateFilter
        ? `AND e.transaction_date BETWEEN $2 AND $3`
        : `AND e.transaction_date >= date_trunc('month', CURRENT_DATE - make_interval(months => $2 - 1))`;
      ({ rows } = await db.query(`
        SELECT EXTRACT(YEAR  FROM e.transaction_date)::int AS year,
               EXTRACT(MONTH FROM e.transaction_date)::int AS month,
               sc.id AS id, sc.name AS label,
               SUM(e.amount)::numeric AS total
        FROM spending.expenses e
        JOIN spending.expense_subcategories sc ON sc.id = e.subcategory_id
        WHERE sc.category_id = $1 ${dateCond}
        GROUP BY year, month, sc.id, sc.name
        ORDER BY year, month
      `, params));
    } else if (typeId) {
      const params = dateFilter
        ? [typeId, dateFilter.from, dateFilter.to]
        : [typeId, numMonths];
      const dateCond = dateFilter
        ? `AND e.transaction_date BETWEEN $2 AND $3`
        : `AND e.transaction_date >= date_trunc('month', CURRENT_DATE - make_interval(months => $2 - 1))`;
      ({ rows } = await db.query(`
        SELECT EXTRACT(YEAR  FROM e.transaction_date)::int AS year,
               EXTRACT(MONTH FROM e.transaction_date)::int AS month,
               c.id AS id, c.name AS label, c.color,
               SUM(e.amount)::numeric AS total
        FROM spending.expenses e
        JOIN spending.expense_categories c ON c.id = e.category_id
        WHERE c.expense_type_id = $1 ${dateCond}
        GROUP BY year, month, c.id, c.name, c.color
        ORDER BY year, month
      `, params));
    } else {
      const params = dateFilter
        ? [dateFilter.from, dateFilter.to]
        : [numMonths];
      const dateCond = dateFilter
        ? `AND e.transaction_date BETWEEN $1 AND $2`
        : `AND e.transaction_date >= date_trunc('month', CURRENT_DATE - make_interval(months => $1 - 1))`;
      ({ rows } = await db.query(`
        SELECT EXTRACT(YEAR  FROM e.transaction_date)::int AS year,
               EXTRACT(MONTH FROM e.transaction_date)::int AS month,
               et.id AS id, et.name AS label, et.color,
               SUM(e.amount)::numeric AS total
        FROM spending.expenses e
        JOIN spending.expense_categories c  ON c.id  = e.category_id
        JOIN spending.expense_types       et ON et.id = c.expense_type_id
        WHERE 1=1 ${dateCond}
        GROUP BY year, month, et.id, et.name, et.color
        ORDER BY year, month
      `, params));
    }
    res.json(rows);
  } catch (e) { err500(res, e); }
});

module.exports = router;
