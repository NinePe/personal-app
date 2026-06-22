const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { err500 } = require('../../utils/errors');

// GET /api/spending/pending — list pending expenses
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM spending.pending_transactions WHERE status = 'pending' ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// GET /api/spending/pending/:id — single pending expense
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM spending.pending_transactions WHERE id = $1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/pending — create from n8n/AI
router.post('/', async (req, res) => {
  const { amount, description, category_name, subcategory_name, payment_method,
          place_name, place_address, transaction_date, notes, raw_message,
          raw_audio_url, is_split, split_people, type } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO spending.pending_transactions
         (amount, description, category_name, subcategory_name, payment_method,
          place_name, place_address, transaction_date, notes, raw_message,
          raw_audio_url, is_split, split_people, type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [amount ?? null, description ?? null, category_name ?? null,
       subcategory_name ?? null, payment_method ?? null, place_name ?? null,
       place_address ?? null, transaction_date ?? null, notes ?? null,
       raw_message ?? null, raw_audio_url ?? null, is_split ?? false,
       split_people ? JSON.stringify(split_people) : null,
       type ?? 'expense']
    );
    res.status(201).json(rows[0]);
  } catch (err) { err500(res, err); }
});

// PATCH /api/spending/pending/:id — update status
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  if (!status || !['pending','approved','ignored'].includes(status)) {
    return res.status(400).json({ error: 'status must be pending, approved, or ignored' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE spending.pending_transactions SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// DELETE /api/spending/pending/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.pending_transactions WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

module.exports = router;
