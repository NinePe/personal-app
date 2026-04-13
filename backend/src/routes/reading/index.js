const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

// ═════════════════════════════════════════════════════════════
// AUTHORS
// ═════════════════════════════════════════════════════════════

router.get('/authors', async (req, res) => {
  const { q } = req.query;
  try {
    const params = [];
    let where = '';
    if (q) { params.push(`%${q.toLowerCase()}%`); where = 'WHERE lower(a.name) LIKE $1'; }
    const { rows } = await db.query(
      `SELECT a.*, COUNT(ba.book_id)::int AS book_count
       FROM reading.authors a
       LEFT JOIN reading.book_authors ba ON ba.author_id = a.id
       ${where}
       GROUP BY a.id
       ORDER BY a.name`,
      params
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// GET /api/reading/authors/:id/books — books by an author
router.get('/authors/:id/books', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${BOOK_SELECT}
       WHERE b.id IN (SELECT book_id FROM reading.book_authors WHERE author_id = $1)
       ORDER BY b.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.post('/authors', async (req, res) => {
  const { name, gender, origin_place, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO reading.authors (name, gender, origin_place, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), gender ?? null, origin_place ?? null, notes ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.put('/authors/:id', async (req, res) => {
  const { name, gender, origin_place, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE reading.authors SET name=$1, gender=$2, origin_place=$3, notes=$4
       WHERE id=$5 RETURNING *`,
      [name, gender ?? null, origin_place ?? null, notes ?? null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.delete('/authors/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM reading.authors WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

// ═════════════════════════════════════════════════════════════
// GENRES
// ═════════════════════════════════════════════════════════════

router.get('/genres', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT g.*, COUNT(bg.book_id)::int AS book_count
      FROM reading.genres g
      LEFT JOIN reading.book_genres bg ON bg.genre_id = g.id
      GROUP BY g.id
      ORDER BY g.name
    `);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.get('/genres/:id/books', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${BOOK_SELECT}
       WHERE b.id IN (SELECT book_id FROM reading.book_genres WHERE genre_id = $1)
       ORDER BY b.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.post('/genres', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO reading.genres (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.put('/genres/:id', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `UPDATE reading.genres SET name = $1 WHERE id = $2 RETURNING *`,
      [name.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.delete('/genres/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM reading.genres WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

// ═════════════════════════════════════════════════════════════
// FORMATS & BOOK TYPES (read-only)
// ═════════════════════════════════════════════════════════════

router.get('/formats', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM reading.formats ORDER BY sort_order, name`);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.get('/book-types', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM reading.book_types ORDER BY sort_order, name`);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// ═════════════════════════════════════════════════════════════
// SAGAS
// ═════════════════════════════════════════════════════════════

router.get('/sagas', async (req, res) => {
  const { q } = req.query;
  try {
    const params = [];
    let where = '';
    if (q) { params.push(`%${q.toLowerCase()}%`); where = 'WHERE lower(name) LIKE $1'; }
    const { rows } = await db.query(
      `SELECT s.*, COUNT(b.id)::int AS book_count
       FROM reading.sagas s
       LEFT JOIN reading.books b ON b.saga_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.name`,
      params
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.get('/sagas/:id/books', async (req, res) => {
  try {
    const { rows } = await db.query(
      `${BOOK_SELECT}
       WHERE b.saga_id = $1
       ORDER BY b.saga_volume NULLS LAST, b.created_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.post('/sagas', async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO reading.sagas (name, description) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING *`,
      [name.trim(), description ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.put('/sagas/:id', async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `UPDATE reading.sagas SET name=$1, description=$2 WHERE id=$3 RETURNING *`,
      [name.trim(), description ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.delete('/sagas/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM reading.sagas WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

// ═════════════════════════════════════════════════════════════
// BOOKS
// ═════════════════════════════════════════════════════════════

const BOOK_SELECT = `
  SELECT b.*,
    CASE WHEN f.id IS NOT NULL
         THEN json_build_object('id',f.id,'name',f.name) END AS format,
    CASE WHEN bt.id IS NOT NULL
         THEN json_build_object('id',bt.id,'name',bt.name,'icon',bt.icon) END AS book_type,
    CASE WHEN s.id IS NOT NULL
         THEN json_build_object('id',s.id,'name',s.name) END AS saga,
    COALESCE(
      (SELECT json_agg(json_build_object('id',a.id,'name',a.name,'gender',a.gender,'origin_place',a.origin_place))
       FROM reading.book_authors ba
       JOIN reading.authors a ON a.id = ba.author_id
       WHERE ba.book_id = b.id), '[]'::json
    ) AS authors,
    COALESCE(
      (SELECT json_agg(json_build_object('id',g.id,'name',g.name))
       FROM reading.book_genres bg
       JOIN reading.genres g ON g.id = bg.genre_id
       WHERE bg.book_id = b.id), '[]'::json
    ) AS genres
  FROM reading.books b
  LEFT JOIN reading.formats     f  ON f.id  = b.format_id
  LEFT JOIN reading.book_types  bt ON bt.id = b.book_type_id
  LEFT JOIN reading.sagas       s  ON s.id  = b.saga_id
`;

// GET /api/reading/books — with optional status filter
router.get('/books', async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status) { params.push(status); where = 'WHERE b.status = $1'; }
  try {
    const { rows } = await db.query(
      `${BOOK_SELECT} ${where} ORDER BY b.created_at DESC`, params
    );
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// GET /api/reading/books/summary — dashboard aggregates
router.get('/books/summary', async (req, res) => {
  try {
    const { rows: [stats] } = await db.query(`
      SELECT
        COUNT(*)::int                                                       AS total_books,
        COUNT(*) FILTER (WHERE status='reading')::int                       AS reading_count,
        COUNT(*) FILTER (WHERE status='queued')::int                        AS queued_count,
        COUNT(*) FILTER (WHERE status='completed')::int                     AS completed_count,
        COALESCE(SUM(current_page) FILTER (WHERE status='reading'), 0)::int AS pages_in_progress,
        COALESCE(SUM(page_count)   FILTER (WHERE status='completed'), 0)::int AS pages_read,
        COALESCE(ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 1), 0) AS avg_rating
      FROM reading.books
    `);

    // Books read this year (status=completed and finished_at in current year)
    const { rows: [yearRow] } = await db.query(`
      SELECT COUNT(*)::int AS books_this_year
      FROM reading.books
      WHERE status = 'completed'
        AND EXTRACT(YEAR FROM finished_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    res.json({ ...stats, books_this_year: yearRow.books_this_year });
  } catch (err) { err500(res, err); }
});

// GET /api/reading/books/:id
router.get('/books/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`${BOOK_SELECT} WHERE b.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

async function saveBookJunctions(client, bookId, authorIds, genreIds) {
  await client.query(`DELETE FROM reading.book_authors WHERE book_id=$1`, [bookId]);
  await client.query(`DELETE FROM reading.book_genres  WHERE book_id=$1`, [bookId]);
  for (const aid of authorIds || []) {
    await client.query(
      `INSERT INTO reading.book_authors (book_id, author_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`, [bookId, aid]
    );
  }
  for (const gid of genreIds || []) {
    await client.query(
      `INSERT INTO reading.book_genres (book_id, genre_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`, [bookId, gid]
    );
  }
}

// POST /api/reading/books
router.post('/books', async (req, res) => {
  const {
    title, subtitle, publisher, page_count, current_page, cover_url,
    is_physical, status, rating, notes, summary,
    format_id, book_type_id, saga_id, saga_volume,
    started_at, finished_at,
    author_ids, genre_ids,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  // Auto-set dates based on status
  const today = new Date().toISOString().split('T')[0];
  const effectiveStarted  = started_at ?? (status === 'reading' || status === 'completed' ? today : null);
  const effectiveFinished = finished_at ?? (status === 'completed' ? today : null);

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [book] } = await client.query(
      `INSERT INTO reading.books
        (title, subtitle, publisher, page_count, current_page, cover_url,
         is_physical, status, rating, notes, summary,
         format_id, book_type_id, saga_id, saga_volume, started_at, finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [title.trim(), subtitle ?? null, publisher ?? null,
       page_count ?? null, current_page ?? 0, cover_url ?? null,
       is_physical ?? false, status ?? 'queued', rating ?? null, notes ?? null, summary ?? null,
       format_id ?? null, book_type_id ?? null, saga_id ?? null, saga_volume ?? null,
       effectiveStarted, effectiveFinished]
    );
    await saveBookJunctions(client, book.id, author_ids, genre_ids);
    await client.query('COMMIT');

    const { rows } = await db.query(`${BOOK_SELECT} WHERE b.id = $1`, [book.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    err500(res, err);
  } finally { client.release(); }
});

// PUT /api/reading/books/:id
router.put('/books/:id', async (req, res) => {
  const {
    title, subtitle, publisher, page_count, current_page, cover_url,
    is_physical, status, rating, notes, summary,
    format_id, book_type_id, saga_id, saga_volume,
    started_at, finished_at,
    author_ids, genre_ids,
  } = req.body;

  // Auto-set dates based on status
  const today2 = new Date().toISOString().split('T')[0];
  const effectiveStarted2  = started_at ?? (status === 'reading' || status === 'completed' ? today2 : null);
  const effectiveFinished2 = finished_at ?? (status === 'completed' ? today2 : null);

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE reading.books
         SET title=$1, subtitle=$2, publisher=$3, page_count=$4, current_page=$5,
             cover_url=$6, is_physical=$7, status=$8, rating=$9, notes=$10, summary=$11,
             format_id=$12, book_type_id=$13, saga_id=$14, saga_volume=$15,
             started_at=$16, finished_at=$17
       WHERE id=$18`,
      [title, subtitle ?? null, publisher ?? null, page_count ?? null, current_page ?? 0,
       cover_url ?? null, is_physical ?? false, status ?? 'queued', rating ?? null,
       notes ?? null, summary ?? null,
       format_id ?? null, book_type_id ?? null, saga_id ?? null, saga_volume ?? null,
       effectiveStarted2, effectiveFinished2, req.params.id]
    );
    await saveBookJunctions(client, req.params.id, author_ids, genre_ids);
    await client.query('COMMIT');

    const { rows } = await db.query(`${BOOK_SELECT} WHERE b.id = $1`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    err500(res, err);
  } finally { client.release(); }
});

// PATCH /api/reading/books/:id/rating — quick rating update
router.patch('/books/:id/rating', async (req, res) => {
  const { rating } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE reading.books SET rating = $1 WHERE id = $2 RETURNING id, rating`,
      [rating ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// PATCH /api/reading/books/:id — partial update (any subset of fields)
router.patch('/books/:id', async (req, res) => {
  const allowed = ['finished_at','started_at','current_page','status','rating','page_count'];
  const sets = [], vals = [];
  let idx = 1;
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      vals.push(req.body[key]);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'No valid fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE reading.books SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

// DELETE /api/reading/books/:id
router.delete('/books/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM reading.books WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

// GET /api/reading/books/:id/reading-stats
// Returns total session minutes + session count for a single book.
router.get('/books/:id/reading-stats', async (req, res) => {
  try {
    const { rows: [row] } = await db.query(`
      SELECT
        COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))), 0)::int AS total_seconds,
        COUNT(*)::int AS session_count,
        COALESCE(SUM(end_page - start_page), 0)::int AS pages_read_sessions
      FROM reading.reading_sessions
      WHERE book_id = $1
    `, [req.params.id]);
    res.json({
      total_seconds: row.total_seconds,
      total_minutes: Math.round(row.total_seconds / 60),
      total_hours:   +(row.total_seconds / 3600).toFixed(1),
      session_count: row.session_count,
      pages_read_sessions: row.pages_read_sessions,
    });
  } catch (err) { err500(res, err); }
});

// GET /api/reading/books/:id/sessions — list all sessions for one book
router.get('/books/:id/sessions', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT *,
        EXTRACT(EPOCH FROM (ended_at - started_at))::int AS duration_seconds,
        (end_page - start_page)                          AS pages_read
      FROM reading.reading_sessions
      WHERE book_id = $1
      ORDER BY started_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

// ═════════════════════════════════════════════════════════════
// READING SESSIONS
// ═════════════════════════════════════════════════════════════

// POST /api/reading/sessions — save a completed reading session
// Body: { book_id, started_at, ended_at, start_page, end_page, notes? }
// Also updates the book's current_page to end_page (if greater).
router.post('/sessions', async (req, res) => {
  const { book_id, started_at, ended_at, start_page, end_page, notes } = req.body;
  if (!book_id || !started_at || !ended_at || start_page == null || end_page == null)
    return res.status(400).json({ error: 'book_id, started_at, ended_at, start_page, end_page are required' });
  if (+end_page < +start_page)
    return res.status(400).json({ error: 'end_page must be >= start_page' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [session] } = await client.query(
      `INSERT INTO reading.reading_sessions
         (book_id, started_at, ended_at, start_page, end_page, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [book_id, started_at, ended_at, start_page, end_page, notes ?? null]
    );
    // Bump the book's current_page to the session's end_page (only forward)
    await client.query(
      `UPDATE reading.books
         SET current_page = GREATEST(COALESCE(current_page, 0), $1)
       WHERE id = $2`,
      [end_page, book_id]
    );
    await client.query('COMMIT');
    res.status(201).json(session);
  } catch (err) {
    await client.query('ROLLBACK');
    err500(res, err);
  } finally { client.release(); }
});

// DELETE /api/reading/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM reading.reading_sessions WHERE id=$1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { err500(res, err); }
});

// ═════════════════════════════════════════════════════════════
// READING GOALS (per year)
// ═════════════════════════════════════════════════════════════

// GET /api/reading/goals/:year  → { year, goal } (default 25 if none)
router.get('/goals/:year', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM reading.reading_goals WHERE year = $1`, [req.params.year]
    );
    if (rows.length) return res.json(rows[0]);
    res.json({ year: +req.params.year, goal: 25, is_default: true });
  } catch (err) { err500(res, err); }
});

// PUT /api/reading/goals/:year — upsert
router.put('/goals/:year', async (req, res) => {
  const { goal } = req.body;
  if (!goal || +goal <= 0)
    return res.status(400).json({ error: 'goal must be a positive integer' });
  try {
    const { rows } = await db.query(`
      INSERT INTO reading.reading_goals (year, goal)
      VALUES ($1, $2)
      ON CONFLICT (year) DO UPDATE SET goal = EXCLUDED.goal, updated_at = now()
      RETURNING *
    `, [req.params.year, goal]);
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

module.exports = router;
