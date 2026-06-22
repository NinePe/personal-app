const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { err500 } = require('../../utils/errors');
const path = require('path');
const fs = require('fs');

const API_CONFIG_PATH = path.resolve('/Users/hansgiancarlovillaloboschavez/Fabrica/fabrica/api-config.json');
let apiConfig;
try { apiConfig = JSON.parse(fs.readFileSync(API_CONFIG_PATH, 'utf-8')); } catch { apiConfig = { activeProvider: 'deepseek', providers: { deepseek: { baseUrl: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY', models: { chat: 'deepseek-chat' } } } }; }
const activeProvider = apiConfig.providers[apiConfig.activeProvider] || apiConfig.providers.deepseek;
const AI_TIMEOUT = 15000;

// Simple in-memory cache
const cache = new Map();
function getCached(k) { const e = cache.get(k); if (!e || Date.now() - e.ts > 30 * 60 * 1000) { cache.delete(k); return null; } return e.data; }
function setCache(k, d) { cache.set(k, { data: d, ts: Date.now() }); }

async function callAI(messages) {
  const apiKey = process.env[activeProvider.apiKeyEnv];
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);
  try {
    const res = await fetch(`${activeProvider.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: activeProvider.models.chat, messages, max_tokens: 2048, temperature: 0.7 }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

router.post('/', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    if (!forceRefresh) { const c = getCached('cinema'); if (c) return res.json(c); }

    // Build context from user's library
    const { rows: watched } = await db.query(`SELECT i.title, i.rating, i.media_type, COALESCE(json_agg(DISTINCT jsonb_build_object('id',g.id,'name',g.name)) FILTER (WHERE g.id IS NOT NULL), '[]') AS genres, COALESCE(json_agg(DISTINCT jsonb_build_object('id',d.id,'name',d.name)) FILTER (WHERE d.id IS NOT NULL), '[]') AS directors FROM cinema.items i LEFT JOIN cinema.item_genres ig ON ig.item_id = i.id LEFT JOIN cinema.genres g ON g.id = ig.genre_id LEFT JOIN cinema.item_directors idir ON idir.item_id = i.id LEFT JOIN cinema.directors d ON d.id = idir.director_id WHERE i.status = 'watched' OR i.status = 'watching' GROUP BY i.id ORDER BY i.rating DESC NULLS LAST`);
    const { rows: watchlist } = await db.query(`SELECT i.title, i.media_type FROM cinema.items i WHERE i.status = 'watchlist'`);

    const ctx = { watched, watchlist, stats: { watched_count: watched.length } };

    const systemPrompt = `Eres un recomendador de cine y TV. USA EXCLUSIVAMENTE los datos del usuario. Basándote en su historial de películas y series vistas, géneros favoritos y directores frecuentes, sugiere 3-5 títulos reales de TMDB que NO estén ya en su biblioteca. Responde SOLO con un array JSON en español: [{"title":"...","reason":"...","media_type":"movie|tv","genre":"..."}]`;
    const userPrompt = `DATOS REALES:\n\n${JSON.stringify(ctx, null, 2)}`;

    const aiResponse = await callAI([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]);
    if (aiResponse) {
      const m = aiResponse.match(/\[[\s\S]*\]/);
      if (m) { const r = { suggestions: JSON.parse(m[0]).slice(0, 5) }; setCache('cinema', r); return res.json(r); }
    }

    // Fallback
    const favGenres = [...new Set(watched.flatMap(i => (i.genres || []).map(g => g.name)))].slice(0, 5);
    res.json({ suggestions: favGenres.map(g => ({ title: `Algo en ${g}`, reason: `Has visto varias películas/series de ${g}. Explora más en este género.`, media_type: 'movie', genre: g })) });
  } catch (err) { err500(res, err); }
});

module.exports = router;
