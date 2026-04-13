const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');
const multer  = require('multer');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Supabase Storage is optional — only used for receipt uploads
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

const EXPENSE_SELECT = `
  SELECT e.*,
    json_build_object('id',c.id,'name',c.name,'type',c.type,'last_four',c.last_four) AS card,
    json_build_object('id',cat.id,'name',cat.name,'icon',cat.icon,'color',cat.color) AS category,
    CASE WHEN sub.id IS NOT NULL THEN json_build_object('id',sub.id,'name',sub.name) END AS subcategory,
    CASE WHEN pl.id  IS NOT NULL THEN json_build_object('id',pl.id,'name',pl.name)  END AS place,
    COALESCE(
      json_agg(
        json_build_object(
          'id',sp.id,'is_me',sp.is_me,'amount',sp.amount,'percentage',sp.percentage,
          'person', CASE WHEN pe.id IS NOT NULL THEN json_build_object('id',pe.id,'name',pe.name,'avatar_url',pe.avatar_url) END
        )
      ) FILTER (WHERE sp.id IS NOT NULL), '[]'
    ) AS splits
  FROM spending.expenses e
  JOIN spending.cards c ON c.id = e.card_id
  JOIN spending.expense_categories cat ON cat.id = e.category_id
  LEFT JOIN spending.expense_subcategories sub ON sub.id = e.subcategory_id
  LEFT JOIN spending.places pl ON pl.id = e.place_id
  LEFT JOIN spending.expense_splits sp ON sp.expense_id = e.id
  LEFT JOIN spending.people pe ON pe.id = sp.person_id
`;

// GET /api/spending/expenses/summary
// Accepts: month+year (legacy) OR from+to (date range), plus optional card_id
router.get('/summary', async (req, res) => {
  const { month, year, from: qFrom, to: qTo, card_id } = req.query;
  let from, to;
  if (qFrom && qTo) {
    from = qFrom; to = qTo;
  } else {
    const m = month || new Date().getMonth() + 1;
    const y = year  || new Date().getFullYear();
    from = `${y}-${String(m).padStart(2,'0')}-01`;
    to   = new Date(y, m, 0).toISOString().split('T')[0];
  }
  const params   = [from, to];
  const cardClause = card_id ? ` AND e.card_id = $3` : '';
  if (card_id) params.push(card_id);
  try {
    const { rows } = await db.query(
      `SELECT cat.name, cat.color, cat.icon, SUM(e.amount) AS total, COUNT(*) AS count
       FROM spending.expenses e
       JOIN spending.expense_categories cat ON cat.id = e.category_id
       WHERE e.transaction_date BETWEEN $1 AND $2${cardClause}
       GROUP BY cat.name, cat.color, cat.icon ORDER BY total DESC`,
      params
    );
    const { rows: totals } = await db.query(
      `SELECT SUM(amount) AS total, COUNT(*) AS count FROM spending.expenses
       WHERE transaction_date BETWEEN $1 AND $2${cardClause}`, params
    );
    res.json({ ...totals[0], byCategory: rows, from, to });
  } catch (err) { err500(res, err); }
});

// GET /api/spending/expenses/people-split
// Accepts: month+year (legacy) OR from+to (date range), plus optional card_id
router.get('/people-split', async (req, res) => {
  const { month, year, from: qFrom, to: qTo, card_id } = req.query;
  let from, to;
  if (qFrom && qTo) {
    from = qFrom; to = qTo;
  } else {
    const m = month || new Date().getMonth() + 1;
    const y = year  || new Date().getFullYear();
    from = `${y}-${String(m).padStart(2,'0')}-01`;
    to   = new Date(y, m, 0).toISOString().split('T')[0];
  }
  const params     = [from, to];
  const cardClause = card_id ? ` AND e.card_id = $3` : '';
  if (card_id) params.push(card_id);
  try {
    const { rows } = await db.query(`
      SELECT
        CASE WHEN sp.is_me THEN NULL ELSE sp.person_id::text END AS person_id,
        CASE WHEN sp.is_me THEN 'Me' ELSE pe.name END AS name,
        sp.is_me,
        SUM(COALESCE(sp.amount, e.amount * sp.percentage / 100)) AS amount,
        COUNT(DISTINCT e.id) AS expense_count
      FROM spending.expense_splits sp
      LEFT JOIN spending.people pe ON pe.id = sp.person_id
      JOIN spending.expenses e ON e.id = sp.expense_id
      WHERE e.transaction_date BETWEEN $1 AND $2${cardClause}
        AND (sp.amount IS NOT NULL OR sp.percentage IS NOT NULL)
      GROUP BY sp.is_me, sp.person_id, pe.name
      ORDER BY SUM(COALESCE(sp.amount, e.amount * sp.percentage / 100)) DESC
    `, params);
    const total = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    res.json(rows.map(r => ({
      ...r,
      percentage: total > 0 ? (parseFloat(r.amount) / total * 100) : 0,
    })));
  } catch (err) { err500(res, err); }
});

// GET /api/spending/expenses/split-detail
// Returns individual expenses per person for a date range + optional card
// Each row = one expense with the split amount for that person
router.get('/split-detail', async (req, res) => {
  const { from, to, card_id, person_id } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
  const params = [from, to];
  const conditions = ['e.transaction_date BETWEEN $1 AND $2'];
  if (card_id) { params.push(card_id); conditions.push(`e.card_id = $${params.length}`); }
  if (person_id) {
    if (person_id === 'me') {
      conditions.push(`sp.is_me = TRUE`);
    } else {
      params.push(person_id);
      conditions.push(`sp.person_id = $${params.length}`);
    }
  }
  const where = conditions.join(' AND ');
  try {
    const { rows } = await db.query(`
      SELECT e.id, e.amount AS expense_total, e.description, e.transaction_date,
        COALESCE(sp.amount, e.amount * sp.percentage / 100) AS split_amount,
        sp.is_me, sp.percentage,
        json_build_object('id',cat.id,'name',cat.name,'icon',cat.icon) AS category,
        CASE WHEN pl.id IS NOT NULL THEN json_build_object('id',pl.id,'name',pl.name) END AS place,
        CASE WHEN pe.id IS NOT NULL THEN json_build_object('id',pe.id,'name',pe.name) END AS person
      FROM spending.expense_splits sp
      JOIN spending.expenses e ON e.id = sp.expense_id
      JOIN spending.expense_categories cat ON cat.id = e.category_id
      LEFT JOIN spending.places pl ON pl.id = e.place_id
      LEFT JOIN spending.people pe ON pe.id = sp.person_id
      WHERE ${where}
      ORDER BY e.transaction_date DESC, e.created_at DESC
    `, params);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// GET /api/spending/expenses/monthly-stats  — all 12 months for a card/year
router.get('/monthly-stats', async (req, res) => {
  const { card_id, year } = req.query;
  if (!card_id) return res.status(400).json({ error: 'card_id required' });
  const y = parseInt(year) || new Date().getFullYear();
  try {
    const { rows } = await db.query(`
      WITH months AS (SELECT generate_series(1, 12) AS month)
      SELECT
        m.month::int,
        $2::int AS year,
        to_char(make_date($2::int, m.month::int, 1), 'YYYY-MM-DD') AS from_date,
        to_char((make_date($2::int, m.month::int, 1) + interval '1 month' - interval '1 day')::date, 'YYYY-MM-DD') AS to_date,
        COALESCE(SUM(e.amount), 0)::numeric AS total,
        COUNT(e.id)::int AS count,
        COUNT(DISTINCT CASE WHEN e.is_split THEN e.id END)::int AS split_count
      FROM months m
      LEFT JOIN spending.expenses e
        ON e.card_id = $1
        AND EXTRACT(YEAR  FROM e.transaction_date) = $2
        AND EXTRACT(MONTH FROM e.transaction_date) = m.month
      GROUP BY m.month
      ORDER BY m.month
    `, [card_id, y]);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// GET /api/spending/expenses
router.get('/', async (req, res) => {
  const { month, year, from: qFrom, to: qTo, card_id, category_id } = req.query;
  const conditions = [];
  const params     = [];

  if (qFrom && qTo) {
    params.push(qFrom, qTo);
    conditions.push(`e.transaction_date BETWEEN $${params.length - 1} AND $${params.length}`);
  } else if (month && year) {
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const to   = new Date(year, month, 0).toISOString().split('T')[0];
    params.push(from, to);
    conditions.push(`e.transaction_date BETWEEN $${params.length - 1} AND $${params.length}`);
  }
  if (card_id)     { params.push(card_id);     conditions.push(`e.card_id = $${params.length}`); }
  if (category_id) { params.push(category_id); conditions.push(`e.category_id = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await db.query(
      `${EXPENSE_SELECT} ${where} GROUP BY e.id, c.id, cat.id, sub.id, pl.id ORDER BY e.transaction_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// POST /api/spending/expenses
router.post('/', async (req, res) => {
  const { amount, description, card_id, category_id, subcategory_id,
          place_id, transaction_date, is_split, split_method, splits, notes } = req.body;

  if (!amount || !card_id || !category_id)
    return res.status(400).json({ error: 'amount, card_id and category_id are required' });

  if (is_split && split_method === 'percentage' && splits?.length) {
    const total = splits.reduce((s, sp) => s + (parseFloat(sp.percentage) || 0), 0);
    if (Math.abs(total - 100) > 0.01)
      return res.status(400).json({ error: `Percentages must total 100% (got ${total.toFixed(1)}%)` });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [expense] } = await client.query(
      `INSERT INTO spending.expenses
         (amount,description,card_id,category_id,subcategory_id,place_id,transaction_date,is_split,split_method,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [amount, description, card_id, category_id, subcategory_id ?? null,
       place_id ?? null, transaction_date, is_split ?? false, split_method ?? null, notes ?? null]
    );

    if (is_split && splits?.length) {
      const totalAmt = parseFloat(amount);
      const each = split_method === 'equal'
        ? (totalAmt / splits.length).toFixed(2) : null;

      for (const sp of splits) {
        const rowAmount =
          split_method === 'specific'   ? sp.amount :
          split_method === 'percentage' ? (totalAmt * parseFloat(sp.percentage ?? 0) / 100).toFixed(2) :
          each;
        await client.query(
          `INSERT INTO spending.expense_splits (expense_id,person_id,is_me,amount,percentage)
           VALUES ($1,$2,$3,$4,$5)`,
          [expense.id, sp.person_id ?? null, sp.is_me ?? false,
           rowAmount,
           split_method === 'percentage' ? sp.percentage : null]
        );
      }
    } else {
      // Non-split expense: always record full amount as "Me" so spending totals are accurate
      await client.query(
        `INSERT INTO spending.expense_splits (expense_id, person_id, is_me, amount, percentage)
         VALUES ($1, NULL, TRUE, $2, 100)`,
        [expense.id, amount]
      );
    }

    await client.query('COMMIT');

    // Return full expense
    const { rows: [full] } = await db.query(
      `${EXPENSE_SELECT} WHERE e.id = $1 GROUP BY e.id, c.id, cat.id, sub.id, pl.id`,
      [expense.id]
    );
    res.status(201).json(full);
  } catch (err) {
    await client.query('ROLLBACK');
    err500(res, err);
  } finally {
    client.release();
  }
});

// GET /api/spending/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${EXPENSE_SELECT} WHERE e.id = $1 GROUP BY e.id, c.id, cat.id, sub.id, pl.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// PUT /api/spending/expenses/:id
router.put('/:id', async (req, res) => {
  const { amount, description, card_id, category_id, subcategory_id,
          place_id, transaction_date, is_split, split_method, splits, notes } = req.body;
  if (!amount || !card_id || !category_id)
    return res.status(400).json({ error: 'amount, card_id and category_id are required' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE spending.expenses
         SET amount=$1, description=$2, card_id=$3, category_id=$4, subcategory_id=$5,
             place_id=$6, transaction_date=$7, is_split=$8, split_method=$9, notes=$10
       WHERE id=$11`,
      [amount, description || null, card_id, category_id, subcategory_id || null,
       place_id || null, transaction_date, is_split ?? false, split_method ?? null,
       notes || null, req.params.id]
    );

    // Re-save splits
    await client.query(`DELETE FROM spending.expense_splits WHERE expense_id=$1`, [req.params.id]);
    const totalAmt = parseFloat(amount);
    if (is_split && splits?.length) {
      const each = split_method === 'equal' ? (totalAmt / splits.length).toFixed(2) : null;
      for (const sp of splits) {
        const rowAmount =
          split_method === 'specific'   ? sp.amount :
          split_method === 'percentage' ? (totalAmt * parseFloat(sp.percentage ?? 0) / 100).toFixed(2) :
          each;
        await client.query(
          `INSERT INTO spending.expense_splits (expense_id,person_id,is_me,amount,percentage)
           VALUES ($1,$2,$3,$4,$5)`,
          [req.params.id, sp.person_id ?? null, sp.is_me ?? false,
           rowAmount, split_method === 'percentage' ? sp.percentage : null]
        );
      }
    } else {
      await client.query(
        `INSERT INTO spending.expense_splits (expense_id,person_id,is_me,amount,percentage)
         VALUES ($1,NULL,TRUE,$2,100)`,
        [req.params.id, totalAmt]
      );
    }

    await client.query('COMMIT');
    const { rows: [full] } = await db.query(
      `${EXPENSE_SELECT} WHERE e.id = $1 GROUP BY e.id, c.id, cat.id, sub.id, pl.id`,
      [req.params.id]
    );
    res.json(full);
  } catch (err) {
    await client.query('ROLLBACK');
    err500(res, err);
  } finally { client.release(); }
});

// DELETE /api/spending/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM spending.expenses WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

// POST /api/spending/expenses/:id/receipt
router.post('/:id/receipt', upload.single('file'), async (req, res) => {
  if (!supabase) return res.status(501).json({ error: 'Storage not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const isPdf = req.file.mimetype === 'application/pdf';
  const path  = `receipts/${req.params.id}.${isPdf ? 'pdf' : 'jpg'}`;

  const { error: upErr } = await supabase.storage
    .from('spending-receipts')
    .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
  if (upErr) return res.status(500).json({ error: upErr.message });

  const { data: { publicUrl } } = supabase.storage.from('spending-receipts').getPublicUrl(path);

  const { rows: [updated] } = await db.query(
    `UPDATE spending.expenses SET receipt_url=$1, receipt_type=$2 WHERE id=$3 RETURNING *`,
    [publicUrl, isPdf ? 'pdf' : 'image', req.params.id]
  );
  res.json(updated);
});

module.exports = router;
