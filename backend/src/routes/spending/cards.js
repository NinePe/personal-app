const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

// GET /api/spending/cards
// Returns all active cards with a dynamically computed `computed_available_credit`
// for credit cards = credit_limit − SUM(unpaid cycles totals).
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      WITH unpaid AS (
        SELECT bc.card_id, COALESCE(SUM(e.amount), 0)::numeric AS consumed
        FROM spending.billing_cycles bc
        LEFT JOIN spending.expenses e
          ON e.card_id = bc.card_id
          AND e.transaction_date BETWEEN bc.from_date AND bc.to_date
        WHERE bc.paid = false
        GROUP BY bc.card_id
      )
      SELECT c.*, b.name AS bank_name,
        COALESCE(u.consumed, 0)::numeric                       AS consumed_credit,
        CASE
          WHEN c.type = 'credit' AND c.credit_limit IS NOT NULL
            THEN (c.credit_limit - COALESCE(u.consumed, 0))::numeric
          ELSE NULL
        END AS computed_available_credit
      FROM spending.cards c
      LEFT JOIN spending.banks b ON b.id = c.bank_id
      LEFT JOIN unpaid u          ON u.card_id = c.id
      WHERE c.is_active = true
      ORDER BY c.created_at
    `);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// GET /api/spending/banks
router.get('/banks', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM spending.banks ORDER BY name`);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/cards
router.post('/', async (req, res) => {
  const { name, type, bank_id, last_four, holder_name, color,
          credit_limit, available_credit, payment_due_day, billing_cycle_day } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO spending.cards
         (name, type, bank_id, last_four, holder_name, color,
          credit_limit, available_credit, payment_due_day, billing_cycle_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, type, bank_id ?? null, last_four, holder_name, color ?? 'purple',
       type === 'credit' ? credit_limit : null,
       type === 'credit' ? available_credit : null,
       type === 'credit' ? payment_due_day : null,
       type === 'credit' ? billing_cycle_day : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { err500(res, err); }
});

// ── Billing cycles ─────────────────────────────────────────────

// GET /api/spending/cards/:id/cycles  — cycles for a card with spending totals
router.get('/:id/cycles', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT bc.id, bc.card_id, bc.name, bc.from_date, bc.to_date,
             bc.paid, bc.paid_at, bc.created_at,
        COALESCE(SUM(e.amount), 0)::numeric AS total,
        COUNT(e.id)::int                    AS count
      FROM spending.billing_cycles bc
      LEFT JOIN spending.expenses e
        ON e.card_id = bc.card_id
        AND e.transaction_date BETWEEN bc.from_date AND bc.to_date
      WHERE bc.card_id = $1
      GROUP BY bc.id
      ORDER BY bc.from_date DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// PATCH /api/spending/cards/cycles/:cycleId/paid  — toggle paid status
router.patch('/cycles/:cycleId/paid', async (req, res) => {
  const { paid } = req.body;
  if (typeof paid !== 'boolean')
    return res.status(400).json({ error: 'paid (boolean) is required' });
  try {
    const { rows } = await db.query(
      `UPDATE spending.billing_cycles
         SET paid = $1, paid_at = CASE WHEN $1 THEN now() ELSE NULL END
       WHERE id = $2 RETURNING *`,
      [paid, req.params.cycleId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cycle not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/cards/:id/cycles
router.post('/:id/cycles', async (req, res) => {
  const { name, from_date, to_date } = req.body;
  if (!name || !from_date || !to_date)
    return res.status(400).json({ error: 'name, from_date and to_date are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO spending.billing_cycles (card_id, name, from_date, to_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, name, from_date, to_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) { err500(res, err); }
});

// PUT /api/spending/cards/cycles/:cycleId
router.put('/cycles/:cycleId', async (req, res) => {
  const { name, from_date, to_date } = req.body;
  if (!name || !from_date || !to_date)
    return res.status(400).json({ error: 'name, from_date and to_date are required' });
  try {
    const { rows } = await db.query(
      `UPDATE spending.billing_cycles SET name=$1, from_date=$2, to_date=$3
       WHERE id=$4 RETURNING *`,
      [name, from_date, to_date, req.params.cycleId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cycle not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// DELETE /api/spending/cards/cycles/:cycleId
router.delete('/cycles/:cycleId', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.billing_cycles WHERE id=$1`, [req.params.cycleId]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

module.exports = router;
