const express = require('express');
const router  = express.Router();
const db      = require('../../config/db');
const { err500 } = require('../../utils/errors');

// ═══════════════════════════════════════════════════════════════
// Categories
// ═══════════════════════════════════════════════════════════════

router.get('/categories', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT c.*, COUNT(sc.id)::int AS subcategory_count FROM purchases.categories c LEFT JOIN purchases.subcategories sc ON sc.category_id = c.id GROUP BY c.id ORDER BY c.sort_order`);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.post('/categories', async (req, res) => {
  const { name, icon, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows: [cat] } = await db.query(`INSERT INTO purchases.categories (name, icon, color) VALUES ($1,$2,$3) RETURNING *`, [name, icon, color]);
    res.status(201).json(cat);
  } catch (err) { err500(res, err); }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM purchases.categories WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

// ═══════════════════════════════════════════════════════════════
// Subcategories
// ═══════════════════════════════════════════════════════════════

router.get('/subcategories', async (req, res) => {
  const { category_id } = req.query;
  try {
    let q = `SELECT sc.*, c.name AS category_name, c.color AS category_color FROM purchases.subcategories sc JOIN purchases.categories c ON c.id = sc.category_id`;
    const params = [];
    if (category_id) { params.push(category_id); q += ` WHERE sc.category_id = $1`; }
    q += ` ORDER BY c.sort_order, sc.name`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.post('/subcategories', async (req, res) => {
  const { category_id, name, icon } = req.body;
  if (!category_id || !name) return res.status(400).json({ error: 'category_id and name are required' });
  try {
    const { rows: [sub] } = await db.query(`INSERT INTO purchases.subcategories (category_id, name, icon) VALUES ($1,$2,$3) RETURNING *`, [category_id, name, icon]);
    res.status(201).json(sub);
  } catch (err) { err500(res, err); }
});

// ═══════════════════════════════════════════════════════════════
// Items CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/items', async (req, res) => {
  const { category_id, subcategory_id, status, search, page, limit } = req.query;
  try {
    let q = `SELECT i.*, sc.name AS subcategory_name, c.name AS category_name, c.color AS category_color, c.icon AS category_icon, CASE WHEN i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date THEN (i.finished_date - i.purchase_date) ELSE NULL END AS duration_days, CASE WHEN i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date THEN ROUND((i.price::numeric / NULLIF(i.finished_date - i.purchase_date, 0))::numeric, 4) ELSE NULL END AS cost_per_day, CASE WHEN i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date THEN ROUND((i.price::numeric / NULLIF(i.finished_date - i.purchase_date, 0) * 30)::numeric, 2) ELSE NULL END AS cost_per_month FROM purchases.items i JOIN purchases.subcategories sc ON sc.id = i.subcategory_id JOIN purchases.categories c ON c.id = sc.category_id WHERE 1=1`;
    const params = [];
    if (category_id) { params.push(category_id); q += ` AND c.id = $${params.length}`; }
    if (subcategory_id) { params.push(subcategory_id); q += ` AND sc.id = $${params.length}`; }
    if (status === 'active') { q += ` AND i.finished_date IS NULL`; }
    if (status === 'finished') { q += ` AND i.finished_date IS NOT NULL`; }
    if (search) { params.push(`%${search}%`); q += ` AND i.name ILIKE $${params.length}`; }
    q += ` ORDER BY i.purchase_date DESC`;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    params.push(limitNum);
    q += ` LIMIT $${params.length}`;
    params.push((pageNum - 1) * limitNum);
    q += ` OFFSET $${params.length}`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.get('/items/:id', async (req, res) => {
  try {
    const { rows: [item] } = await db.query(`SELECT i.*, sc.name AS subcategory_name, c.name AS category_name, c.color AS category_color, c.icon AS category_icon FROM purchases.items i JOIN purchases.subcategories sc ON sc.id = i.subcategory_id JOIN purchases.categories c ON c.id = sc.category_id WHERE i.id = $1`, [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Not found' });

    // Get previous purchases of same subcategory for comparison
    const { rows: history } = await db.query(`SELECT id, brand, size_label, price, purchase_date, finished_date, rating, CASE WHEN finished_date > purchase_date THEN finished_date - purchase_date ELSE NULL END AS duration_days FROM purchases.items WHERE subcategory_id = $1 AND id != $2 ORDER BY purchase_date DESC`, [item.subcategory_id, req.params.id]);

    res.json({ ...item, history });
  } catch (err) { err500(res, err); }
});

router.post('/items', async (req, res) => {
  const { subcategory_id, name, brand, size_label, quantity, unit, unit_size, price, currency, store, purchase_date, rating, notes } = req.body;
  if (!subcategory_id || !name || !price) return res.status(400).json({ error: 'subcategory_id, name, and price are required' });
  try {
    const { rows: [item] } = await db.query(`INSERT INTO purchases.items (subcategory_id, name, brand, size_label, quantity, unit, unit_size, price, currency, store, purchase_date, rating, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [subcategory_id, name, brand, size_label, quantity || 1, unit || 'unit', unit_size, price, currency || 'PEN', store, purchase_date || new Date().toISOString().split('T')[0], rating, notes]);
    res.status(201).json(item);
  } catch (err) { err500(res, err); }
});

router.patch('/items/:id', async (req, res) => {
  const { finished_date, rating, notes, name, brand, size_label, price, store } = req.body;
  try {
    const sets = []; const params = [req.params.id];
    if (finished_date !== undefined) { params.push(finished_date); sets.push(`finished_date = $${params.length}`); }
    if (rating !== undefined) { params.push(rating); sets.push(`rating = $${params.length}`); }
    if (notes !== undefined) { params.push(notes); sets.push(`notes = $${params.length}`); }
    if (name !== undefined) { params.push(name); sets.push(`name = $${params.length}`); }
    if (brand !== undefined) { params.push(brand); sets.push(`brand = $${params.length}`); }
    if (size_label !== undefined) { params.push(size_label); sets.push(`size_label = $${params.length}`); }
    if (price !== undefined) { params.push(price); sets.push(`price = $${params.length}`); }
    if (store !== undefined) { params.push(store); sets.push(`store = $${params.length}`); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(new Date().toISOString()); sets.push(`updated_at = $${params.length}`);
    const { rows } = await db.query(`UPDATE purchases.items SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.delete('/items/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM purchases.items WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

// ═══════════════════════════════════════════════════════════════
// Stats & Analytics
// ═══════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const { rows: [totals] } = await db.query(`SELECT COUNT(*)::int AS total_items, COUNT(*) FILTER (WHERE finished_date IS NULL)::int AS active_items, COUNT(*) FILTER (WHERE finished_date IS NOT NULL)::int AS finished_items, COALESCE(SUM(price) FILTER (WHERE finished_date IS NULL), 0)::float AS active_value, COALESCE(SUM(price) FILTER (WHERE date_trunc('month', purchase_date) = date_trunc('month', now())), 0)::float AS spent_this_month, COALESCE(SUM(price) FILTER (WHERE date_trunc('month', purchase_date) = date_trunc('month', now() - INTERVAL '1 month')), 0)::float AS spent_last_month FROM purchases.items`);

    const { rows: byCategory } = await db.query(`SELECT c.id, c.name, c.color, c.icon, COUNT(i.id)::int AS count, COALESCE(SUM(i.price), 0)::float AS total_spent, AVG(CASE WHEN i.finished_date > i.purchase_date THEN i.finished_date - i.purchase_date ELSE NULL END)::int AS avg_duration_days FROM purchases.categories c LEFT JOIN purchases.subcategories sc ON sc.category_id = c.id LEFT JOIN purchases.items i ON i.subcategory_id = sc.id GROUP BY c.id ORDER BY total_spent DESC`);

    const { rows: bySubcategory } = await db.query(`SELECT sc.id, sc.name, c.name AS category_name, c.color, COUNT(i.id)::int AS count, COALESCE(SUM(i.price), 0)::float AS total_spent, AVG(CASE WHEN i.finished_date > i.purchase_date THEN i.finished_date - i.purchase_date ELSE NULL END)::int AS avg_duration_days FROM purchases.subcategories sc JOIN purchases.categories c ON c.id = sc.category_id LEFT JOIN purchases.items i ON i.subcategory_id = sc.id GROUP BY sc.id, c.name, c.color ORDER BY total_spent DESC`);

    const { rows: monthly } = await db.query(`SELECT TO_CHAR(purchase_date, 'YYYY-MM') AS month, COUNT(*)::int AS count, COALESCE(SUM(price), 0)::float AS total FROM purchases.items GROUP BY month ORDER BY month DESC LIMIT 12`);

    const { rows: topItems } = await db.query(`SELECT i.name, i.brand, sc.name AS subcategory_name, COUNT(*)::int AS times_purchased, COALESCE(AVG(i.price), 0)::float AS avg_price, COALESCE(AVG(CASE WHEN i.finished_date > i.purchase_date THEN i.finished_date - i.purchase_date ELSE NULL END), 0)::int AS avg_days FROM purchases.items i JOIN purchases.subcategories sc ON sc.id = i.subcategory_id GROUP BY i.name, i.brand, sc.name HAVING COUNT(*) > 1 ORDER BY times_purchased DESC LIMIT 10`);

    res.json({ totals, byCategory, bySubcategory, monthly, topItems });
  } catch (err) { err500(res, err); }
});

// ═══════════════════════════════════════════════════════════════
// AI Predictions & Alerts
// ═══════════════════════════════════════════════════════════════

router.get('/predictions', async (req, res) => {
  try {
    const predictions = [];

    // 1. Items about to run out (based on avg duration per subcategory)
    const { rows: runningOut } = await db.query(`
      WITH avg_duration AS (
        SELECT subcategory_id, AVG(finished_date - purchase_date)::int AS avg_days
        FROM purchases.items WHERE finished_date IS NOT NULL AND finished_date > purchase_date
        GROUP BY subcategory_id
      )
      SELECT i.id, i.name, i.brand, i.size_label, i.purchase_date, i.price,
             sc.name AS subcategory_name, c.name AS category_name, c.color,
             d.avg_days,
             (i.purchase_date + d.avg_days) AS predicted_finish,
             (i.purchase_date + d.avg_days - CURRENT_DATE) AS days_left
      FROM purchases.items i
      JOIN purchases.subcategories sc ON sc.id = i.subcategory_id
      JOIN purchases.categories c ON c.id = sc.category_id
      JOIN avg_duration d ON d.subcategory_id = i.subcategory_id
      WHERE i.finished_date IS NULL
        AND (i.purchase_date + d.avg_days - CURRENT_DATE) <= 7
      ORDER BY days_left ASC
    `);
    predictions.push({ type: 'running_out', label: 'Running out soon (≤7 days)', items: runningOut });

    // 2. Suggested restock — items finished recently that you might need
    const { rows: restock } = await db.query(`
      SELECT i.name, i.brand, i.size_label, i.finished_date, i.price,
             sc.name AS subcategory_name, c.name AS category_name, c.color,
             (CURRENT_DATE - i.finished_date) AS days_since_finished
      FROM purchases.items i
      JOIN purchases.subcategories sc ON sc.id = i.subcategory_id
      JOIN purchases.categories c ON c.id = sc.category_id
      WHERE i.finished_date IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM purchases.items i2
          WHERE i2.subcategory_id = i.subcategory_id
            AND i2.finished_date IS NULL
        )
        AND i.finished_date >= CURRENT_DATE - INTERVAL '90 days'
      ORDER BY i.finished_date DESC
      LIMIT 12
    `);
    predictions.push({ type: 'restock', label: 'Depleted — consider restocking', items: restock });

    // 3. Price trends and better-value alternatives
    const { rows: priceTrends } = await db.query(`
      WITH item_trends AS (
        SELECT i.name, i.brand, sc.name AS subcategory_name, sc.id AS subcategory_id,
               COUNT(*)::int AS times_purchased,
               MIN(i.price)::float AS min_price,
              MAX(i.price)::float AS max_price,
              AVG(i.price)::float AS avg_price,
              (AVG(i.price) - LAG(AVG(i.price)) OVER (PARTITION BY sc.id ORDER BY AVG(i.price)))::float AS price_change
        FROM purchases.items i
        JOIN purchases.subcategories sc ON sc.id = i.subcategory_id
        GROUP BY i.name, i.brand, sc.name, sc.id
        HAVING COUNT(*) >= 2
      )
      SELECT * FROM item_trends ORDER BY times_purchased DESC LIMIT 12
    `);
    predictions.push({ type: 'price_trends', label: 'Price trends', items: priceTrends });

    // 4. Best value (lowest cost per day)
    const { rows: bestValue } = await db.query(`
      SELECT i.name, i.brand, i.size_label, i.price,
             sc.name AS subcategory_name, c.name AS category_name,
             (i.finished_date - i.purchase_date) AS duration_days,
             ROUND((i.price::numeric / NULLIF(i.finished_date - i.purchase_date, 0))::numeric, 4) AS cost_per_day,
             ROUND((i.price::numeric / NULLIF(i.finished_date - i.purchase_date, 0) * 30)::numeric, 2) AS cost_per_month
      FROM purchases.items i
      JOIN purchases.subcategories sc ON sc.id = i.subcategory_id
      JOIN purchases.categories c ON c.id = sc.category_id
      WHERE i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date
      ORDER BY cost_per_day ASC
      LIMIT 20
    `);
    predictions.push({ type: 'best_value', label: 'Best value (lowest cost/day)', items: bestValue });

    res.json(predictions);
  } catch (err) { err500(res, err); }
});

// Comparison for a specific subcategory
router.get('/compare/:subcategory_id', async (req, res) => {
  try {
    const { rows: items } = await db.query(`
      SELECT i.*, (i.finished_date - i.purchase_date) AS duration_days,
             ROUND((i.price::numeric / NULLIF(i.finished_date - i.purchase_date, 0))::numeric, 4) AS cost_per_day,
             ROUND((i.price::numeric / NULLIF(i.finished_date - i.purchase_date, 0) * 30)::numeric, 2) AS cost_per_month
      FROM purchases.items i
      WHERE i.subcategory_id = $1 AND i.finished_date IS NOT NULL AND i.finished_date > i.purchase_date
      ORDER BY i.purchase_date DESC
    `, [req.params.subcategory_id]);

    const { rows: [stats] } = await db.query(`
      SELECT
        COUNT(*)::int AS times_purchased,
        AVG(price)::float AS avg_price,
        AVG(finished_date - purchase_date)::int AS avg_days,
        AVG(ROUND((price::numeric / NULLIF(finished_date - purchase_date, 0))::numeric, 4))::float AS avg_cost_per_day,
        AVG(ROUND((price::numeric / NULLIF(finished_date - purchase_date, 0) * 30)::numeric, 2))::float AS avg_cost_per_month,
        MIN(price)::float AS min_price,
        MAX(price)::float AS max_price
      FROM purchases.items
      WHERE subcategory_id = $1 AND finished_date IS NOT NULL AND finished_date > purchase_date
    `, [req.params.subcategory_id]);

    const { rows: [current] } = await db.query(`
      SELECT * FROM purchases.items WHERE subcategory_id = $1 AND finished_date IS NULL ORDER BY purchase_date DESC LIMIT 1
    `, [req.params.subcategory_id]);

    res.json({ items, stats: stats || {}, current: current || null });
  } catch (err) { err500(res, err); }
});

module.exports = router;
