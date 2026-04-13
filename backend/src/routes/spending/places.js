const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

// GET /api/spending/places  — with optional search
router.get('/', async (req, res) => {
  const { q } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT * FROM spending.places WHERE ($1::text IS NULL OR name ILIKE $1) ORDER BY name`,
      [q ? `%${q}%` : null]
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// GET /api/spending/places/stats  — places + spending totals
//   ?filter=month|year|all|custom  &from=YYYY-MM-DD  &to=YYYY-MM-DD
router.get('/stats', async (req, res) => {
  const { filter = 'month', from, to } = req.query;
  let dateClause = '';
  const params = [];

  if (filter === 'month') {
    dateClause = `AND date_trunc('month', e.transaction_date) = date_trunc('month', CURRENT_DATE)`;
  } else if (filter === 'year') {
    dateClause = `AND EXTRACT(YEAR FROM e.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
  } else if (filter === 'custom' && from && to) {
    params.push(from, to);
    dateClause = `AND e.transaction_date BETWEEN $1::date AND $2::date`;
  }
  // else 'all' — no date filter

  try {
    const { rows } = await db.query(`
      SELECT p.*,
        COALESCE(SUM(e.amount), 0)::numeric AS total_spent,
        COUNT(e.id)::int                    AS visit_count,
        MAX(e.transaction_date)             AS last_visit
      FROM spending.places p
      LEFT JOIN spending.expenses e ON e.place_id = p.id ${dateClause}
      GROUP BY p.id
      ORDER BY total_spent DESC, p.name
    `, params);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/places
router.post('/', async (req, res) => {
  const { name, address, category, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO spending.places (name,address,category,notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, address || null, category || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { err500(res, err); }
});

// PUT /api/spending/places/:id
router.put('/:id', async (req, res) => {
  const { name, address, category, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE spending.places SET name=$1,address=$2,category=$3,notes=$4 WHERE id=$5 RETURNING *`,
      [name, address || null, category || null, notes || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// DELETE /api/spending/places/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM spending.places WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

module.exports = router;
