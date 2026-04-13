const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

const GOAL_SELECT = `
  SELECT g.*,
    COALESCE(SUM(c.amount), 0)::numeric         AS current_amount,
    COUNT(c.id)::int                             AS contributions_count
  FROM spending.savings_goals g
  LEFT JOIN spending.savings_contributions c ON c.goal_id = g.id
`;

// GET /api/spending/savings
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${GOAL_SELECT} GROUP BY g.id ORDER BY g.created_at DESC`
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/savings
router.post('/', async (req, res) => {
  const { name, target_amount, deadline, icon, color, notes } = req.body;
  if (!name || !target_amount) return res.status(400).json({ error: 'name and target_amount required' });
  try {
    const { rows: [row] } = await db.query(
      `INSERT INTO spending.savings_goals (name, target_amount, deadline, icon, color, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [name, target_amount, deadline || null, icon || 'savings', color || '#68558d', notes || null]
    );
    const { rows: [full] } = await db.query(
      `${GOAL_SELECT} WHERE g.id = $1 GROUP BY g.id`, [row.id]
    );
    res.status(201).json(full);
  } catch (err) { err500(res, err); }
});

// PUT /api/spending/savings/:id
router.put('/:id', async (req, res) => {
  const { name, target_amount, deadline, icon, color, status, notes } = req.body;
  try {
    await db.query(
      `UPDATE spending.savings_goals
       SET name=$1, target_amount=$2, deadline=$3, icon=$4, color=$5, status=$6, notes=$7
       WHERE id=$8`,
      [name, target_amount, deadline || null, icon, color, status, notes || null, req.params.id]
    );
    const { rows: [full] } = await db.query(
      `${GOAL_SELECT} WHERE g.id = $1 GROUP BY g.id`, [req.params.id]
    );
    res.json(full);
  } catch (err) { err500(res, err); }
});

// DELETE /api/spending/savings/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.savings_goals WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

// GET /api/spending/savings/:id/contributions
router.get('/:id/contributions', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM spending.savings_contributions WHERE goal_id=$1 ORDER BY contribution_date DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/savings/:id/contributions  — returns updated goal
router.post('/:id/contributions', async (req, res) => {
  const { amount, note, contribution_date } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  try {
    await db.query(
      `INSERT INTO spending.savings_contributions (goal_id, amount, note, contribution_date)
       VALUES ($1,$2,$3,$4)`,
      [req.params.id, amount, note || null,
       contribution_date || new Date().toISOString().split('T')[0]]
    );
    // Auto-mark done if target reached
    await db.query(`
      UPDATE spending.savings_goals g
      SET status = 'done'
      WHERE g.id = $1
        AND g.status = 'active'
        AND (SELECT COALESCE(SUM(amount),0) FROM spending.savings_contributions WHERE goal_id = $1)
            >= g.target_amount
    `, [req.params.id]);

    const { rows: [full] } = await db.query(
      `${GOAL_SELECT} WHERE g.id = $1 GROUP BY g.id`, [req.params.id]
    );
    res.status(201).json(full);
  } catch (err) { err500(res, err); }
});

// DELETE /api/spending/savings/contributions/:contribId
router.delete('/contributions/:contribId', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.savings_contributions WHERE id=$1`, [req.params.contribId]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

module.exports = router;
