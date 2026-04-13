const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

const INCOME_SELECT = `
  SELECT i.*,
    CASE WHEN c.id IS NOT NULL
         THEN json_build_object('id',c.id,'name',c.name,'type',c.type,'last_four',c.last_four)
    END AS card,
    CASE WHEN cat.id IS NOT NULL
         THEN json_build_object('id',cat.id,'name',cat.name,'icon',cat.icon,'color',cat.color)
    END AS category,
    CASE WHEN sub.id IS NOT NULL
         THEN json_build_object('id',sub.id,'name',sub.name)
    END AS subcategory
  FROM spending.income i
  LEFT JOIN spending.cards c ON c.id = i.card_id
  LEFT JOIN spending.income_categories cat ON cat.id = i.category_id
  LEFT JOIN spending.income_subcategories sub ON sub.id = i.subcategory_id
`;

// GET /api/spending/income/categories  — with nested subcategories
router.get('/categories', async (req, res) => {
  try {
    const { rows: cats } = await db.query(
      `SELECT * FROM spending.income_categories ORDER BY sort_order`
    );
    const { rows: subs } = await db.query(
      `SELECT * FROM spending.income_subcategories ORDER BY sort_order`
    );
    res.json(cats.map(c => ({
      ...c,
      subcategories: subs.filter(s => s.category_id === c.id),
    })));
  } catch (err) { err500(res, err); }
});

// GET /api/spending/income/summary
// Returns total + count for the requested period + prev_month total for comparison
router.get('/summary', async (req, res) => {
  const { month, year, from: qFrom, to: qTo } = req.query;
  let from, to, prevFrom, prevTo;

  if (qFrom && qTo) {
    from = qFrom; to = qTo;
  } else {
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year)  || new Date().getFullYear();
    from = `${y}-${String(m).padStart(2,'0')}-01`;
    to   = new Date(y, m, 0).toISOString().split('T')[0];
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    prevFrom = `${py}-${String(pm).padStart(2,'0')}-01`;
    prevTo   = new Date(py, pm, 0).toISOString().split('T')[0];
  }

  try {
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS total, COUNT(*)::int AS count
       FROM spending.income WHERE transaction_date BETWEEN $1 AND $2`,
      [from, to]
    );
    let prevTotal = null;
    if (prevFrom) {
      const { rows: prev } = await db.query(
        `SELECT COALESCE(SUM(amount),0)::numeric AS total
         FROM spending.income WHERE transaction_date BETWEEN $1 AND $2`,
        [prevFrom, prevTo]
      );
      prevTotal = prev[0].total;
    }
    res.json({ ...rows[0], from, to, prev_total: prevTotal });
  } catch (err) { err500(res, err); }
});

// GET /api/spending/income
router.get('/', async (req, res) => {
  const { month, year, from: qFrom, to: qTo, category_id } = req.query;
  const conditions = [], params = [];

  if (qFrom && qTo) {
    params.push(qFrom, qTo);
    conditions.push(`i.transaction_date BETWEEN $${params.length - 1} AND $${params.length}`);
  } else if (month && year) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const to   = new Date(year, month, 0).toISOString().split('T')[0];
    params.push(from, to);
    conditions.push(`i.transaction_date BETWEEN $${params.length - 1} AND $${params.length}`);
  } else if (year && !month) {
    params.push(`${year}-01-01`, `${year}-12-31`);
    conditions.push(`i.transaction_date BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  if (category_id) {
    params.push(category_id);
    conditions.push(`i.category_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const { rows } = await db.query(
      `${INCOME_SELECT} ${where} ORDER BY i.transaction_date DESC, i.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/income
router.post('/', async (req, res) => {
  const { amount, description, card_id, category_id, subcategory_id, transaction_date, notes } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  try {
    const { rows: [row] } = await db.query(
      `INSERT INTO spending.income (amount,description,card_id,category_id,subcategory_id,transaction_date,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [amount, description || null, card_id || null, category_id || null,
       subcategory_id || null, transaction_date || new Date().toISOString().split('T')[0], notes || null]
    );
    const { rows: [full] } = await db.query(
      `${INCOME_SELECT} WHERE i.id = $1`, [row.id]
    );
    res.status(201).json(full);
  } catch (err) { err500(res, err); }
});

// GET /api/spending/income/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`${INCOME_SELECT} WHERE i.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// PUT /api/spending/income/:id
router.put('/:id', async (req, res) => {
  const { amount, description, card_id, category_id, subcategory_id, transaction_date, notes } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });
  try {
    await db.query(
      `UPDATE spending.income
         SET amount=$1, description=$2, card_id=$3, category_id=$4,
             subcategory_id=$5, transaction_date=$6, notes=$7
       WHERE id=$8`,
      [amount, description || null, card_id || null, category_id || null,
       subcategory_id || null, transaction_date, notes || null, req.params.id]
    );
    const { rows: [full] } = await db.query(`${INCOME_SELECT} WHERE i.id = $1`, [req.params.id]);
    res.json(full);
  } catch (err) { err500(res, err); }
});

// DELETE /api/spending/income/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.income WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

module.exports = router;
