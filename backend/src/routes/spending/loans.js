const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

// SELECT helper: joins person, card and returns a single loan row shape
const LOAN_SELECT = `
  SELECT l.*,
    json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url, 'relationship', p.relationship) AS person,
    CASE WHEN c.id IS NOT NULL
         THEN json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'last_four', c.last_four)
    END AS card
  FROM spending.loans l
  JOIN spending.people p ON p.id = l.person_id
  LEFT JOIN spending.cards c ON c.id = l.card_id
`;

// GET /api/spending/loans/summary
// Returns totals + per-person active balances (only non-zero)
router.get('/summary', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.id, p.name, p.avatar_url, p.relationship,
        SUM(CASE WHEN l.direction = 'i_lent'     THEN l.amount ELSE 0 END)::numeric AS total_lent,
        SUM(CASE WHEN l.direction = 'i_borrowed' THEN l.amount ELSE 0 END)::numeric AS total_borrowed,
        SUM(CASE WHEN l.direction = 'i_lent'     THEN l.amount
                 ELSE -l.amount END)::numeric AS balance,
        COUNT(l.id)::int                                   AS transaction_count,
        MAX(l.transaction_date)                            AS last_activity,
        (SELECT description FROM spending.loans
           WHERE person_id = p.id ORDER BY transaction_date DESC, created_at DESC LIMIT 1) AS last_description
      FROM spending.people p
      JOIN spending.loans l ON l.person_id = p.id
      GROUP BY p.id
      HAVING SUM(CASE WHEN l.direction = 'i_lent' THEN l.amount ELSE -l.amount END) <> 0
      ORDER BY ABS(SUM(CASE WHEN l.direction = 'i_lent' THEN l.amount ELSE -l.amount END)) DESC
    `);

    // Totals
    const totals = rows.reduce((acc, r) => {
      const bal = parseFloat(r.balance);
      if (bal > 0) { acc.total_owed_to_me += bal; acc.borrowers += 1; }
      else if (bal < 0) { acc.total_i_owe += Math.abs(bal); acc.creditors += 1; }
      return acc;
    }, { total_owed_to_me: 0, total_i_owe: 0, borrowers: 0, creditors: 0 });

    res.json({
      totals: {
        total_owed_to_me: totals.total_owed_to_me.toFixed(2),
        total_i_owe:      totals.total_i_owe.toFixed(2),
        borrowers:        totals.borrowers,
        creditors:        totals.creditors,
      },
      people: rows,
    });
  } catch (err) { err500(res, err); }
});

// GET /api/spending/loans/person/:personId
// Full history for a single person + running balance per transaction
router.get('/person/:personId', async (req, res) => {
  try {
    const { rows: [person] } = await db.query(
      `SELECT * FROM spending.people WHERE id = $1`, [req.params.personId]
    );
    if (!person) return res.status(404).json({ error: 'Person not found' });

    const { rows: transactions } = await db.query(
      `${LOAN_SELECT} WHERE l.person_id = $1 ORDER BY l.transaction_date DESC, l.created_at DESC`,
      [req.params.personId]
    );

    // Stats
    const stats = transactions.reduce((acc, t) => {
      const amt = parseFloat(t.amount);
      if (t.direction === 'i_lent') {
        acc.total_lent += amt;
        acc.times_lent += 1;
      } else {
        acc.total_borrowed += amt;
        acc.times_borrowed += 1;
      }
      return acc;
    }, { total_lent: 0, total_borrowed: 0, times_lent: 0, times_borrowed: 0 });

    const balance = stats.total_lent - stats.total_borrowed;

    res.json({
      person,
      balance: balance.toFixed(2),
      stats: {
        total_lent:     stats.total_lent.toFixed(2),
        total_borrowed: stats.total_borrowed.toFixed(2),
        times_lent:     stats.times_lent,
        times_borrowed: stats.times_borrowed,
      },
      transactions,
    });
  } catch (err) { err500(res, err); }
});

// GET /api/spending/loans/:id  — single transaction (for edit mode)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`${LOAN_SELECT} WHERE l.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/loans
router.post('/', async (req, res) => {
  const { person_id, direction, amount, description, transaction_date, card_id } = req.body;
  if (!person_id || !direction || !amount)
    return res.status(400).json({ error: 'person_id, direction and amount are required' });
  if (!['i_lent', 'i_borrowed'].includes(direction))
    return res.status(400).json({ error: 'direction must be i_lent or i_borrowed' });
  if (+amount <= 0)
    return res.status(400).json({ error: 'amount must be > 0' });

  try {
    const { rows: [row] } = await db.query(
      `INSERT INTO spending.loans (person_id, direction, amount, description, transaction_date, card_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [person_id, direction, amount, description ?? null,
       transaction_date || new Date().toISOString().split('T')[0], card_id ?? null]
    );
    const { rows: [full] } = await db.query(`${LOAN_SELECT} WHERE l.id = $1`, [row.id]);
    res.status(201).json(full);
  } catch (err) { err500(res, err); }
});

// PUT /api/spending/loans/:id
router.put('/:id', async (req, res) => {
  const { person_id, direction, amount, description, transaction_date, card_id } = req.body;
  if (!person_id || !direction || !amount)
    return res.status(400).json({ error: 'person_id, direction and amount are required' });
  try {
    await db.query(
      `UPDATE spending.loans
         SET person_id=$1, direction=$2, amount=$3, description=$4,
             transaction_date=$5, card_id=$6
       WHERE id=$7`,
      [person_id, direction, amount, description ?? null,
       transaction_date, card_id ?? null, req.params.id]
    );
    const { rows: [full] } = await db.query(`${LOAN_SELECT} WHERE l.id = $1`, [req.params.id]);
    res.json(full);
  } catch (err) { err500(res, err); }
});

// DELETE /api/spending/loans/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.loans WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

module.exports = router;
