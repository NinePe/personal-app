const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { err500 } = require('../../utils/errors');

const TMDB_KEY = '6444268efecf1a432928712b39ace592';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

// -- TMDB Proxy --------------------------------------------

router.get('/search', async (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ error: 'q is required' });
  try {
    const url = `${TMDB_BASE}/search/${type || 'multi'}?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=es&page=1`;
    const r = await fetch(url);
    const data = await r.json();
    const results = (data.results || []).slice(0, 20).map(item => ({
      id: item.id,
      media_type: item.media_type || type,
      title: item.title || item.name,
      original_title: item.original_title || item.original_name,
      overview: item.overview,
      poster_path: item.poster_path ? `${IMG_BASE}/w342${item.poster_path}` : null,
      backdrop_path: item.backdrop_path ? `${IMG_BASE}/w780${item.backdrop_path}` : null,
      release_date: item.release_date || item.first_air_date,
      vote_average: item.vote_average,
      genre_ids: item.genre_ids || [],
      origin_country: item.origin_country || [],
      original_language: item.original_language,
    })).filter(i => i.media_type === 'movie' || i.media_type === 'tv');
    res.json(results);
  } catch (err) { err500(res, err); }
});

router.get('/tmdb/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  try {
    const url = `${TMDB_BASE}/${type}/${id}?api_key=${TMDB_KEY}&language=es&append_to_response=credits,content_ratings`;
    const r = await fetch(url);
    const item = await r.json();

    // For TV: also fetch each season's episodes
    if (type === 'tv' && item.seasons) {
      for (const season of item.seasons) {
        if (season.season_number === 0) continue; // skip specials
        const epUrl = `${TMDB_BASE}/tv/${id}/season/${season.season_number}?api_key=${TMDB_KEY}&language=es`;
        const epR = await fetch(epUrl);
        const epData = await epR.json();
        season.episodes = (epData.episodes || []).map(ep => ({
          id: ep.id,
          episode_number: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          still_path: ep.still_path ? `${IMG_BASE}/w300${ep.still_path}` : null,
          runtime: ep.runtime,
          air_date: ep.air_date,
        }));
      }
    }

    // Extract directors from credits
    const directors = (item.credits?.crew || [])
      .filter(c => c.job === 'Director')
      .map(d => ({ id: d.id, name: d.name, photo_path: d.profile_path ? `${IMG_BASE}/w185${d.profile_path}` : null }));

    res.json({
      id: item.id,
      media_type: type,
      title: item.title || item.name,
      original_title: item.original_title || item.original_name,
      overview: item.overview,
      poster_path: item.poster_path ? `${IMG_BASE}/w342${item.poster_path}` : null,
      backdrop_path: item.backdrop_path ? `${IMG_BASE}/w780${item.backdrop_path}` : null,
      release_date: item.release_date || item.first_air_date,
      runtime: item.runtime || (item.episode_run_time?.[0]),
      genres: (item.genres || []).map(g => ({ id: g.id, name: g.name })),
      vote_average: item.vote_average,
      number_of_seasons: item.number_of_seasons,
      number_of_episodes: item.number_of_episodes,
      seasons: item.seasons || [],
      directors,
      origin_country: item.origin_country || (item.production_countries || []).map(c => c.iso_3166_1),
      original_language: item.original_language,
      status: item.status,
    });
  } catch (err) { err500(res, err); }
});

// -- CRUD Items --------------------------------------------

router.get('/items', async (req, res) => {
  const { status, type } = req.query;
  try {
    let q = `SELECT i.*, COALESCE(json_agg(DISTINCT jsonb_build_object('id',g.id,'name',g.name)) FILTER (WHERE g.id IS NOT NULL), '[]') AS genres, COALESCE(json_agg(DISTINCT jsonb_build_object('id',d.id,'name',d.name,'photo_path',d.photo_path)) FILTER (WHERE d.id IS NOT NULL), '[]') AS directors FROM cinema.items i LEFT JOIN cinema.item_genres ig ON ig.item_id = i.id LEFT JOIN cinema.genres g ON g.id = ig.genre_id LEFT JOIN cinema.item_directors idir ON idir.item_id = i.id LEFT JOIN cinema.directors d ON d.id = idir.director_id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND i.status = $${params.length}`; }
    if (type) { params.push(type); q += ` AND i.media_type = $${params.length}`; }
    q += ` GROUP BY i.id ORDER BY i.updated_at DESC`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { err500(res, err); }
});

router.get('/items/:id', async (req, res) => {
  try {
    const { rows: [item] } = await db.query(`SELECT i.*, COALESCE(json_agg(DISTINCT jsonb_build_object('id',g.id,'name',g.name)) FILTER (WHERE g.id IS NOT NULL), '[]') AS genres, COALESCE(json_agg(DISTINCT jsonb_build_object('id',d.id,'name',d.name,'photo_path',d.photo_path)) FILTER (WHERE d.id IS NOT NULL), '[]') AS directors FROM cinema.items i LEFT JOIN cinema.item_genres ig ON ig.item_id = i.id LEFT JOIN cinema.genres g ON g.id = ig.genre_id LEFT JOIN cinema.item_directors idir ON idir.item_id = i.id LEFT JOIN cinema.directors d ON d.id = idir.director_id WHERE i.id = $1 GROUP BY i.id`, [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Not found' });

    // Get seasons with episodes
    const { rows: seasons } = await db.query(`SELECT s.*, COALESCE(json_agg(json_build_object('id',e.id,'episode_number',e.episode_number,'name',e.name,'overview',e.overview,'still_path',e.still_path,'runtime',e.runtime,'air_date',e.air_date,'watched',e.watched,'watched_at',e.watched_at) ORDER BY e.episode_number) FILTER (WHERE e.id IS NOT NULL), '[]') AS episodes FROM cinema.seasons s LEFT JOIN cinema.episodes e ON e.season_id = s.id WHERE s.item_id = $1 GROUP BY s.id ORDER BY s.season_number`, [req.params.id]);

    // If seasons exist but have no episodes, fetch from TMDB and persist
    const hasEpisodes = seasons.some(s => (s.episodes || []).length > 0);
    if (!hasEpisodes && item.media_type === 'tv') {
      const seasonFetches = seasons.map(s =>
        fetch(`${TMDB_BASE}/tv/${item.tmdb_id}/season/${s.season_number}?api_key=${TMDB_KEY}&language=es`)
          .then(r => r.json())
          .then(async (epData) => {
            const tmdbEps = epData.episodes || [];
            if (!tmdbEps.length) { s.episodes = []; return s; }
            // Batch insert all episodes for this season
            const values = [], params = [];
            tmdbEps.forEach((ep, i) => {
              const base = i * 7;
              params.push(s.id, ep.episode_number, ep.name, ep.overview, ep.still_path ? `${IMG_BASE}/w300${ep.still_path}` : null, ep.runtime, ep.air_date);
              values.push(`($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7})`);
            });
            const { rows: saved } = await db.query(
              `INSERT INTO cinema.episodes (season_id, episode_number, name, overview, still_path, runtime, air_date)
               VALUES ${values.join(', ')} ON CONFLICT (season_id, episode_number) DO UPDATE SET name=EXCLUDED.name, overview=EXCLUDED.overview, still_path=EXCLUDED.still_path, runtime=EXCLUDED.runtime, air_date=EXCLUDED.air_date RETURNING *`,
              params
            );
            s.episodes = saved;
            return s;
          })
          .catch(() => s)
      );
      const enriched = await Promise.all(seasonFetches);
      res.json({ ...item, seasons: enriched });
    } else {
      res.json({ ...item, seasons });
    }
  } catch (err) { err500(res, err); }
});

router.post('/items', async (req, res) => {
  let { tmdb_id, media_type, title, original_title, overview, poster_path, backdrop_path, release_date, first_air_date, runtime, number_of_seasons, number_of_episodes, country, language, genres, directors, status } = req.body;

  // Auto-fetch from TMDB if title is missing
  if (!title && tmdb_id && media_type) {
    try {
      const tmdbRes = await fetch(`${TMDB_BASE}/${media_type}/${tmdb_id}?api_key=${TMDB_KEY}&language=es&append_to_response=credits`);
      const tmdb = await tmdbRes.json();
      title = tmdb.title || tmdb.name;
      original_title = tmdb.original_title || tmdb.original_name;
      overview = tmdb.overview;
      poster_path = tmdb.poster_path ? `${IMG_BASE}/w342${tmdb.poster_path}` : null;
      backdrop_path = tmdb.backdrop_path ? `${IMG_BASE}/w780${tmdb.backdrop_path}` : null;
      release_date = tmdb.release_date || null;
      first_air_date = tmdb.first_air_date || null;
      runtime = tmdb.runtime || (tmdb.episode_run_time?.[0]) || null;
      number_of_seasons = tmdb.number_of_seasons || null;
      number_of_episodes = tmdb.number_of_episodes || null;
      country = tmdb.origin_country?.[0] || (tmdb.production_countries?.[0]?.iso_3166_1) || null;
      language = tmdb.original_language || null;
      genres = (tmdb.genres || []).map(g => ({ id: g.id, name: g.name }));
      directors = (tmdb.credits?.crew || []).filter(c => c.job === 'Director').map(d => ({ id: d.id, name: d.name, photo_path: d.profile_path ? `${IMG_BASE}/w185${d.profile_path}` : null }));

      // Create seasons skeleton (episodes fetched lazily on detail view)
      if (media_type === 'tv' && tmdb.seasons) {
        req.body._tmdb_seasons = tmdb.seasons
          .filter(s => s.season_number > 0)
          .map(s => ({
            season_number: s.season_number,
            name: s.name,
            overview: s.overview,
            poster_path: s.poster_path ? `${IMG_BASE}/w342${s.poster_path}` : null,
            episode_count: s.episode_count || 0,
            episodes: [],
          }));
      }
    } catch (e) {
      console.error('[Cinema] TMDB fetch failed:', e.message);
    }
  }

  if (!title) return res.status(400).json({ error: 'title is required' });

  // Check if already exists
  const { rows: existing } = await db.query(`SELECT id FROM cinema.items WHERE tmdb_id = $1 AND media_type = $2`, [tmdb_id, media_type]);
  if (existing.length) return res.status(409).json({ error: 'Already in library', id: existing[0].id });

  try {
    const { rows: [item] } = await db.query(`INSERT INTO cinema.items (tmdb_id, media_type, title, original_title, overview, poster_path, backdrop_path, release_date, first_air_date, runtime, number_of_seasons, number_of_episodes, country, language, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [tmdb_id, media_type, title, original_title, overview, poster_path, backdrop_path, release_date || null, first_air_date || null, runtime || null, number_of_seasons || null, number_of_episodes || null, country || null, language || null, status || 'watchlist']);

    if (genres?.length) {
      for (const g of genres) {
        await db.query(`INSERT INTO cinema.genres (id, name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name=$2`, [g.id, g.name]);
        await db.query(`INSERT INTO cinema.item_genres (item_id, genre_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [item.id, g.id]);
      }
    }

    if (directors?.length) {
      for (const d of directors) {
        await db.query(`INSERT INTO cinema.directors (id, name, photo_path) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET name=$2, photo_path=$3`, [d.id, d.name, d.photo_path]);
        await db.query(`INSERT INTO cinema.item_directors (item_id, director_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [item.id, d.id]);
      }
    }

    const seasons = req.body.seasons || req.body._tmdb_seasons || [];
    if (media_type === 'tv' && seasons.length) {
      for (const season of seasons) {
        if (season.season_number === 0) continue;
        const { rows: [s] } = await db.query(`INSERT INTO cinema.seasons (item_id, season_number, name, overview, poster_path, episode_count) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [item.id, season.season_number, season.name, season.overview, season.poster_path, season.episodes?.length || 0]);
        if (season.episodes) {
          for (const ep of season.episodes) {
            await db.query(`INSERT INTO cinema.episodes (season_id, episode_number, name, overview, still_path, runtime, air_date) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [s.id, ep.episode_number, ep.name, ep.overview, ep.still_path, ep.runtime, ep.air_date]);
          }
        }
      }
    }

    res.status(201).json(item);
  } catch (err) { err500(res, err); }
});

router.patch('/items/:id', async (req, res) => {
  const { status, rating, comments } = req.body;
  try {
    const sets = [], params = [req.params.id];
    if (status !== undefined) { params.push(status); sets.push(`status = $${params.length}`); }
    if (rating !== undefined) { params.push(rating); sets.push(`rating = $${params.length}`); }
    if (comments !== undefined) { params.push(comments); sets.push(`comments = $${params.length}`); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(new Date().toISOString());
    sets.push(`updated_at = $${params.length}`);
    const { rows } = await db.query(`UPDATE cinema.items SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.delete('/items/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM cinema.items WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

// -- Episodes ----------------------------------------------

router.patch('/episodes/:id', async (req, res) => {
  const { watched, rating, comments } = req.body;
  try {
    const sets = [];
    const params = [req.params.id];
    if (watched !== undefined) {
      params.push(watched);
      sets.push(`watched = $${params.length}`);
      sets.push(`watched_at = CASE WHEN $${params.length} THEN now() ELSE NULL END`);
    }
    if (rating !== undefined) { params.push(rating); sets.push(`rating = $${params.length}`); }
    if (comments !== undefined) { params.push(comments); sets.push(`comments = $${params.length}`); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    const { rows } = await db.query(`UPDATE cinema.episodes SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    // Update season watched count
    const { rows: [season] } = await db.query(
      `UPDATE cinema.seasons SET watched_episodes = (SELECT COUNT(*) FROM cinema.episodes WHERE season_id = $1 AND watched = true) WHERE id = $1 RETURNING item_id`,
      [rows[0].season_id]
    );

    // Check if ALL episodes across ALL seasons are watched → auto-promote to 'watched'
    if (watched && season) {
      const { rows: [check] } = await db.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE watched = true)::int AS watched_count FROM cinema.episodes e JOIN cinema.seasons s ON s.id = e.season_id WHERE s.item_id = $1`,
        [season.item_id]
      );
      if (check && check.total > 0 && check.total === check.watched_count) {
        await db.query(`UPDATE cinema.items SET status = 'watched', updated_at = now() WHERE id = $1 AND status != 'watched'`, [season.item_id]);
      }
    }

    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

router.patch('/seasons/:id/watch-all', async (req, res) => {
  try {
    await db.query(`UPDATE cinema.episodes SET watched = true, watched_at = now() WHERE season_id = $1 AND watched = false`, [req.params.id]);
    const { rows: [season] } = await db.query(
      `UPDATE cinema.seasons SET watched_episodes = (SELECT COUNT(*) FROM cinema.episodes WHERE season_id = $1 AND watched = true) WHERE id = $1 RETURNING item_id`,
      [req.params.id]
    );

    // Check if ALL episodes across ALL seasons are now watched
    if (season) {
      const { rows: [check] } = await db.query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE watched = true)::int AS watched_count FROM cinema.episodes e JOIN cinema.seasons s ON s.id = e.season_id WHERE s.item_id = $1`,
        [season.item_id]
      );
      if (check && check.total > 0 && check.total === check.watched_count) {
        await db.query(`UPDATE cinema.items SET status = 'watched', updated_at = now() WHERE id = $1 AND status != 'watched'`, [season.item_id]);
      }
    }

    res.json({ ok: true });
  } catch (err) { err500(res, err); }
});

// -- Stats ------------------------------------------------

router.get('/stats', async (req, res) => {
  try {
    const { rows: [totals] } = await db.query(`SELECT COUNT(*)::int AS total_items, COUNT(*) FILTER (WHERE status = 'watched')::int AS watched_items, COUNT(*) FILTER (WHERE status = 'watching')::int AS watching_items, COUNT(*) FILTER (WHERE status = 'watchlist')::int AS watchlist_items, COUNT(*) FILTER (WHERE media_type = 'movie')::int AS movies, COUNT(*) FILTER (WHERE media_type = 'tv')::int AS series, COALESCE(SUM(runtime) FILTER (WHERE status = 'watched'), 0)::int AS total_minutes, COALESCE(SUM(number_of_episodes) FILTER (WHERE media_type = 'tv'), 0)::int AS total_episodes, (SELECT COUNT(*)::int FROM cinema.episodes WHERE watched = true) AS watched_episodes FROM cinema.items`);

    const { rows: byGenre } = await db.query(`SELECT g.id, g.name, COUNT(*)::int AS count FROM cinema.genres g JOIN cinema.item_genres ig ON ig.genre_id = g.id JOIN cinema.items i ON i.id = ig.item_id WHERE i.status = 'watched' GROUP BY g.id, g.name ORDER BY count DESC LIMIT 10`);

    const { rows: byDirector } = await db.query(`SELECT d.id, d.name, d.photo_path, COUNT(*)::int AS count FROM cinema.directors d JOIN cinema.item_directors idir ON idir.director_id = d.id JOIN cinema.items i ON i.id = idir.item_id GROUP BY d.id, d.name, d.photo_path ORDER BY count DESC LIMIT 10`);

    const { rows: byType } = await db.query(`SELECT media_type, COUNT(*)::int AS count FROM cinema.items GROUP BY media_type`);

    const { rows: recentWatched } = await db.query(`SELECT i.id, i.title, i.poster_path, i.media_type, i.updated_at FROM cinema.items i WHERE i.status = 'watched' ORDER BY i.updated_at DESC LIMIT 10`);

    res.json({ totals, byGenre, byDirector, byType, recentWatched });
  } catch (err) { err500(res, err); }
});

// ── Daily watch history ─────────────────────────────

router.get('/history', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 5, 50);
  const offset = (page - 1) * limit;
  const period = req.query.period || 'all';
  let dateFilter = '';
  if (period === 'week') dateFilter = `WHERE day >= CURRENT_DATE - INTERVAL '7 days'`;
  else if (period === 'month') dateFilter = `WHERE day >= CURRENT_DATE - INTERVAL '30 days'`;
  else if (period === 'year') dateFilter = `WHERE day >= CURRENT_DATE - INTERVAL '365 days'`;
  try {
    const { rows: daily } = await db.query(`
      WITH ep_days AS (
        SELECT date(watched_at) AS day, SUM(COALESCE(e.runtime, 0))::int AS ep_minutes, COUNT(*)::int AS ep_count
        FROM cinema.episodes e WHERE e.watched = true AND e.watched_at IS NOT NULL GROUP BY day
      ),
      mov_days AS (
        SELECT date(updated_at) AS day, SUM(COALESCE(i.runtime, 0))::int AS mov_minutes, COUNT(*)::int AS mov_count
        FROM cinema.items i WHERE i.status = 'watched' AND i.media_type = 'movie' AND i.updated_at IS NOT NULL GROUP BY day
      ),
      combined AS (
        SELECT COALESCE(ep.day, mov.day) AS day, COALESCE(ep.ep_minutes, 0) + COALESCE(mov.mov_minutes, 0) AS total_minutes,
          COALESCE(ep.ep_count, 0) AS episodes, COALESCE(mov.mov_count, 0) AS movies
        FROM ep_days ep FULL OUTER JOIN mov_days mov ON ep.day = mov.day
      )
      SELECT day::text, total_minutes, episodes, movies FROM combined ${dateFilter} ORDER BY day ASC
    `);

    // Paginated history: individual watched items (most recent first)
    const { rows: history } = await db.query(`
      (SELECT i.id, i.title, i.poster_path, i.media_type, i.runtime, i.updated_at AS watched_at, NULL::int AS season_number, NULL::int AS episode_number, i.rating
       FROM cinema.items i WHERE i.status = 'watched' AND i.media_type = 'movie')
      UNION ALL
      (SELECT i.id, i.title || ' — ' || e.name AS title, i.poster_path, 'episode' AS media_type, e.runtime, e.watched_at, s.season_number, e.episode_number, e.rating
       FROM cinema.episodes e JOIN cinema.seasons s ON s.id = e.season_id JOIN cinema.items i ON i.id = s.item_id WHERE e.watched = true AND e.watched_at IS NOT NULL)
      ORDER BY watched_at DESC NULLS LAST LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Total count for pagination
    const { rows: [countRow] } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM cinema.items WHERE status = 'watched' AND media_type = 'movie') +
        (SELECT COUNT(*) FROM cinema.episodes WHERE watched = true AND watched_at IS NOT NULL) AS total
    `);

    res.json({ daily, history, total: parseInt(countRow.total), page, limit });
  } catch (err) { err500(res, err); }
});

// PATCH /api/cinema/episodes/:id/date — change watched date
router.patch('/episodes/:id/date', async (req, res) => {
  const { watched_at } = req.body;
  if (!watched_at) return res.status(400).json({ error: 'watched_at is required' });
  try {
    const { rows } = await db.query(`UPDATE cinema.episodes SET watched_at = $1 WHERE id = $2 RETURNING *`, [watched_at, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { err500(res, err); }
});

module.exports = router;
