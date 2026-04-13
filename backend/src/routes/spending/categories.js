const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

// GET /api/spending/categories  (with subcategories)
router.get('/', async (req, res) => {
  try {
    const { rows: cats } = await db.query(
      `SELECT id, name, icon, color, sort_order, expense_type_id
       FROM spending.expense_categories ORDER BY sort_order`
    );
    const { rows: subs } = await db.query(
      `SELECT id, category_id, name, sort_order
       FROM spending.expense_subcategories ORDER BY category_id, sort_order`
    );
    res.json(cats.map(c => ({ ...c, subcategories: subs.filter(s => s.category_id === c.id) })));
  } catch (err) { err500(res, err); }
});

// POST create category
router.post('/', async (req, res) => {
  const { name, icon, color, sort_order, expense_type_id } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO spending.expense_categories (name,icon,color,sort_order,expense_type_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, icon || 'category', color || '#68558d', sort_order ?? 0, expense_type_id || null]
    );
    res.json({ ...rows[0], subcategories: [] });
  } catch (e) { err500(res, e); }
});

// PUT update category
router.put('/:id', async (req, res) => {
  const { name, icon, color, sort_order, expense_type_id } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE spending.expense_categories
       SET name=$1,icon=$2,color=$3,sort_order=$4,expense_type_id=$5
       WHERE id=$6 RETURNING *`,
      [name, icon, color, sort_order, expense_type_id || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { err500(res, e); }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM spending.expense_categories WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { err500(res, e); }
});

// POST create subcategory
router.post('/:categoryId/subcategories', async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO spending.expense_subcategories (category_id,name,sort_order)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.params.categoryId, name, sort_order ?? 0]
    );
    res.json(rows[0]);
  } catch (e) { err500(res, e); }
});

// PUT update subcategory
router.put('/subcategories/:id', async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE spending.expense_subcategories SET name=$1,sort_order=$2 WHERE id=$3 RETURNING *`,
      [name, sort_order, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { err500(res, e); }
});

// DELETE subcategory
router.delete('/subcategories/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM spending.expense_subcategories WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { err500(res, e); }
});

module.exports = router;
