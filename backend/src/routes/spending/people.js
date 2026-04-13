const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM spending.people ORDER BY name`
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.post('/', async (req, res) => {
  const { name, relationship, email, phone, avatar_url, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO spending.people (name,relationship,email,phone,avatar_url,notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, relationship, email, phone, avatar_url, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.put('/:id', async (req, res) => {
  const { name, relationship, email, phone, avatar_url, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `UPDATE spending.people SET name=$1,relationship=$2,email=$3,phone=$4,avatar_url=$5,notes=$6
       WHERE id=$7 RETURNING *`,
      [name, relationship, email, phone, avatar_url, notes, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.people WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

module.exports = router;
