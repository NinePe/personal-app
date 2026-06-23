const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { err500 } = require('../utils/errors');
const path    = require('path');
const fs      = require('fs');

// ════════════════════════════════════════════════════════════════
// In-memory cache (survives until server restart)
// ════════════════════════════════════════════════════════════════

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ════════════════════════════════════════════════════════════════
// API Configuration
// ════════════════════════════════════════════════════════════════

const API_CONFIG_PATH = process.env.API_CONFIG_PATH
  || path.resolve(__dirname, '../../../../fabrica/api-config.json');

let apiConfig;
try {
  apiConfig = JSON.parse(fs.readFileSync(API_CONFIG_PATH, 'utf-8'));
} catch {
  apiConfig = {
    activeProvider: 'deepseek',
    providers: {
      deepseek: {
        baseUrl: 'https://api.deepseek.com',
        apiKeyEnv: 'DEEPSEEK_API_KEY',
        models: { chat: 'deepseek-chat' },
      },
    },
  };
}

const activeProvider = apiConfig.providers[apiConfig.activeProvider]
  || apiConfig.providers.deepseek;

const AI_TIMEOUT = 15000; // 15 seconds

// ════════════════════════════════════════════════════════════════
// AI call helper
// ════════════════════════════════════════════════════════════════

async function callAI(messages) {
  const apiKey = process.env[activeProvider.apiKeyEnv];
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT);

  try {
    const url = `${activeProvider.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: activeProvider.models.chat,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[Suggestions AI] HTTP ${res.status}: ${text}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[Suggestions AI] Request timed out after 15 s');
    } else {
      console.error('[Suggestions AI] Request failed:', err.message);
  }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ════════════════════════════════════════════════════════════════
// Context builders
// ════════════════════════════════════════════════════════════════

async function buildReadingContext() {
  // Currently reading books
  const { rows: currentlyReading } = await db.query(`
    SELECT b.id, b.title, b.page_count, b.current_page, b.rating,
      COALESCE(
        (SELECT json_agg(json_build_object('id',a.id,'name',a.name))
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
    WHERE b.status = 'reading'
    ORDER BY b.created_at DESC
  `);

  // Completed books with ratings
  const { rows: completedBooks } = await db.query(`
    SELECT b.id, b.title, b.rating, b.page_count, b.finished_at
    FROM reading.books b
    WHERE b.status = 'completed' AND b.rating IS NOT NULL
    ORDER BY b.rating DESC
  `);

  // Queued / pending books
  const { rows: queuedBooks } = await db.query(`
    SELECT b.id, b.title
    FROM reading.books b
    WHERE b.status = 'queued'
    ORDER BY b.created_at DESC
  `);

  // Favorite authors (from books rated >= 4)
  const { rows: favoriteAuthors } = await db.query(`
    SELECT a.id, a.name,
      COUNT(*)::int          AS book_count,
      ROUND(AVG(b.rating), 1) AS avg_rating
    FROM reading.books b
    JOIN reading.book_authors ba ON ba.book_id = b.id
    JOIN reading.authors a      ON a.id = ba.author_id
    WHERE b.status = 'completed' AND b.rating >= 4
    GROUP BY a.id, a.name
    ORDER BY avg_rating DESC, book_count DESC
  `);

  // Favorite genres (most-read)
  const { rows: favoriteGenres } = await db.query(`
    SELECT g.id, g.name,
      COUNT(*)::int          AS book_count,
      ROUND(AVG(b.rating), 1) AS avg_rating
    FROM reading.books b
    JOIN reading.book_genres bg ON bg.book_id = b.id
    JOIN reading.genres g      ON g.id = bg.genre_id
    WHERE b.status = 'completed'
    GROUP BY g.id, g.name
    ORDER BY book_count DESC, avg_rating DESC
  `);

  // Reading pace (last year)
  const { rows: [pace] } = await db.query(`
    SELECT
      COUNT(*)::int                                      AS total_sessions,
      COALESCE(AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60), 0)::int
        AS avg_session_minutes,
      COALESCE(AVG(end_page - start_page), 0)::int        AS avg_pages_per_session,
      COALESCE(SUM(end_page - start_page), 0)::int         AS total_pages_read
    FROM reading.reading_sessions
    WHERE started_at >= NOW() - INTERVAL '1 year'
  `);

  // Saga progress (include saga info for currently reading / queued books)
  const { rows: sagas } = await db.query(`
    SELECT s.id, s.name,
      COUNT(*) FILTER (WHERE b.status IN ('reading','queued','paused','dropped'))::int
        AS pending_books,
      COUNT(*) FILTER (WHERE b.status = 'completed')::int AS completed_books
    FROM reading.sagas s
    JOIN reading.books b ON b.saga_id = s.id
    WHERE b.saga_id IS NOT NULL
    GROUP BY s.id, s.name
    ORDER BY completed_books DESC
  `);

  return {
    currentlyReading,
    completedBooks,
    queuedBooks,
    favoriteAuthors,
    favoriteGenres,
    readingPace: pace,
    sagas,
    stats: {
      total_books: currentlyReading.length + completedBooks.length + queuedBooks.length,
      reading_count: currentlyReading.length,
      completed_count: completedBooks.length,
      queued_count: queuedBooks.length,
    },
  };
}

async function buildSpendingContext() {
  // Use ALL available data (up to ~3 years) — no date filter
  const since = '2020-01-01';

  // Monthly spending by category — OWNER only (with splits) — ALL TIME
  const { rows: monthlySpending } = await db.query(`
    SELECT
      ec.name  AS category,
      ec.icon,
      ec.color,
      EXTRACT(YEAR  FROM e.transaction_date)::int AS year,
      EXTRACT(MONTH FROM e.transaction_date)::int AS month,
      SUM(COALESCE(split.amount, e.amount))::numeric AS total
    FROM spending.expenses e
    JOIN spending.expense_categories ec ON ec.id = e.category_id
    LEFT JOIN spending.expense_splits split ON split.expense_id = e.id AND split.is_me = true
    WHERE e.transaction_date >= $1
    GROUP BY ec.name, ec.icon, ec.color, year, month
    ORDER BY year, month, total DESC
  `, [since]);

  // Top categories — OWNER only — ALL TIME
  const { rows: topCategories } = await db.query(`
    SELECT
      ec.name              AS category,
      ec.icon,
      ec.color,
      SUM(COALESCE(split.amount, e.amount))::numeric AS total,
      COUNT(*)::int          AS transaction_count
    FROM spending.expenses e
    JOIN spending.expense_categories ec ON ec.id = e.category_id
    LEFT JOIN spending.expense_splits split ON split.expense_id = e.id AND split.is_me = true
    WHERE e.transaction_date >= $1
    GROUP BY ec.name, ec.icon, ec.color
    ORDER BY total DESC
  `, [since]);

  // Income — ALL TIME
  const { rows: incomeTrends } = await db.query(`
    SELECT
      EXTRACT(YEAR  FROM transaction_date)::int AS year,
      EXTRACT(MONTH FROM transaction_date)::int AS month,
      SUM(amount)::numeric                       AS total,
      COUNT(*)::int                               AS count
    FROM spending.income
    WHERE transaction_date >= $1
    GROUP BY year, month
    ORDER BY year, month
  `, [since]);

  // Active loans
  const { rows: activeLoans } = await db.query(`
    SELECT
      p.id, p.name, p.relationship,
      SUM(CASE WHEN l.direction = 'i_lent' THEN l.amount ELSE -l.amount END)::numeric
        AS balance
    FROM spending.people p
    JOIN spending.loans l ON l.person_id = p.id
    GROUP BY p.id, p.name, p.relationship
    HAVING SUM(CASE WHEN l.direction = 'i_lent' THEN l.amount ELSE -l.amount END) <> 0
    ORDER BY ABS(SUM(CASE WHEN l.direction = 'i_lent' THEN l.amount ELSE -l.amount END)) DESC
  `);

  // Savings goals
  const { rows: savingsGoals } = await db.query(`
    SELECT g.id, g.name, g.target_amount, g.status, g.deadline,
      COALESCE(SUM(c.amount), 0)::numeric AS current_amount,
      CASE WHEN g.target_amount > 0
        THEN ROUND(COALESCE(SUM(c.amount), 0) / g.target_amount * 100, 1)
        ELSE 0
      END AS progress_pct
    FROM spending.savings_goals g
    LEFT JOIN spending.savings_contributions c ON c.goal_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `);

  // Daily avg last 30 days — OWNER only
  const { rows: [dailySpending] } = await db.query(`
    SELECT
      COALESCE(AVG(daily.total), 0)::numeric AS avg_daily,
      COALESCE(SUM(daily.total), 0)::numeric  AS total_30_days,
      COUNT(daily.*)::int                     AS days_with_expenses
    FROM (
      SELECT e.transaction_date, SUM(COALESCE(split.amount, e.amount)) AS total
      FROM spending.expenses e
      LEFT JOIN spending.expense_splits split ON split.expense_id = e.id AND split.is_me = true
      WHERE e.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY e.transaction_date
    ) daily
  `);

  // Monthly total — ALL TIME — OWNER only
  const { rows: monthlyTotals } = await db.query(`
    SELECT
      EXTRACT(YEAR  FROM e.transaction_date)::int AS year,
      EXTRACT(MONTH FROM e.transaction_date)::int AS month,
      SUM(COALESCE(split.amount, e.amount))::numeric AS total
    FROM spending.expenses e
    LEFT JOIN spending.expense_splits split ON split.expense_id = e.id AND split.is_me = true
    WHERE e.transaction_date >= $1
    GROUP BY year, month
    ORDER BY year, month
  `, [since]);

  // ═══ Compute trend analysis ═══
  const totals = monthlyTotals.map(r => parseFloat(r.total));
  const months = monthlyTotals.map(r => `${r.year}-${String(r.month).padStart(2,'0')}`);

  // Overall trend: linear regression slope
  const n = totals.length;
  let slope = 0, avgTotal = 0, trendDir = 'estable';
  if (n >= 3) {
    const xMean = (n - 1) / 2;
    const yMean = totals.reduce((a, b) => a + b, 0) / n;
    avgTotal = yMean;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - xMean) * (totals[i] - yMean); den += (i - xMean) ** 2; }
    slope = den !== 0 ? num / den : 0;
    trendDir = slope > 50 ? 'al alza' : slope < -50 ? 'a la baja' : 'estable';
  }

  // Last 6 months for recent comparison
  const recent6 = totals.slice(-6);
  const prev6 = totals.slice(-12, -6);
  const avgRecent = recent6.length ? recent6.reduce((a, b) => a + b, 0) / recent6.length : 0;
  const avgPrev = prev6.length ? prev6.reduce((a, b) => a + b, 0) / prev6.length : 0;
  const changePct = avgPrev > 0 ? ((avgRecent - avgPrev) / avgPrev * 100).toFixed(1) : 0;

  // Category-level trends: per category, compute recent vs previous avg
  const catTrends = {};
  for (const row of monthlySpending) {
    const key = row.category;
    if (!catTrends[key]) catTrends[key] = { recent: [], prev: [], all: [] };
    const yr = row.year, mo = row.month;
    const val = parseFloat(row.total);
    catTrends[key].all.push({ yr, mo, val });
    // Compare first half vs second half of available months per category
  }
  // Simplify: per category, split into first half and second half
  for (const [cat, data] of Object.entries(catTrends)) {
    const vals = data.all.map(d => d.val);
    const mid = Math.floor(vals.length / 2);
    const first = vals.slice(0, mid);
    const second = vals.slice(mid);
    const avg1 = first.length ? first.reduce((a, b) => a + b, 0) / first.length : 0;
    const avg2 = second.length ? second.reduce((a, b) => a + b, 0) / second.length : 0;
    data.firstHalfAvg = Math.round(avg1 * 100) / 100;
    data.secondHalfAvg = Math.round(avg2 * 100) / 100;
    data.trend = avg2 > avg1 * 1.05 ? 'subiendo' : avg2 < avg1 * 0.95 ? 'bajando' : 'estable';
    data.changePct = avg1 > 0 ? ((avg2 - avg1) / avg1 * 100).toFixed(1) : 0;
    // Keep only the last 12 months of detail to avoid overflow
    data.recentMonths = data.all.slice(-12);
    delete data.all;
  }

  // Monthly income totals
  const incomeTotals = incomeTrends.map(r => parseFloat(r.total));
  const avgIncome = incomeTotals.length ? incomeTotals.reduce((a, b) => a + b, 0) / incomeTotals.length : 0;

  return {
    monthlySpending,
    topCategories,
    incomeTrends,
    activeLoans,
    savingsGoals,
    dailySpending,
    monthlyTotals,
    totalMonths: n,
    dateRange: { from: months[0] || 'N/A', to: months[months.length - 1] || 'N/A' },
    trend: {
      direction: trendDir,
      slope: Math.round(slope * 100) / 100,
      avgMonthly: Math.round(avgTotal * 100) / 100,
      avgRecent6: Math.round(avgRecent * 100) / 100,
      avgPrev6: Math.round(avgPrev * 100) / 100,
      changePct6vs6: parseFloat(changePct),
      avgMonthlyIncome: Math.round(avgIncome * 100) / 100,
    },
    categoryTrends: catTrends,
  };
}

// ════════════════════════════════════════════════════════════════
// Fallback generators (rule-based, when AI key is missing)
// ════════════════════════════════════════════════════════════════

function fallbackReadingSuggestions(ctx) {
  const suggestions = [];

  // 1. Géneros favoritos
  if (ctx.favoriteGenres.length > 0) {
    const topGenres = ctx.favoriteGenres.slice(0, 3);
    topGenres.forEach(g => {
      suggestions.push({
        title: `Explora más ${g.name}`,
        author: '—',
        reason: `Has leído ${g.book_count} libro(s) de ${g.name} con una calificación promedio de ${g.avg_rating}. Busca más títulos en este género.`,
        genre: g.name,
      });
    });
  }

  // 2. Autores favoritos
  if (ctx.favoriteAuthors.length > 0) {
    ctx.favoriteAuthors.slice(0, 2).forEach(a => {
      suggestions.push({
        title: `Más de ${a.name}`,
        author: a.name,
        reason: `Calificaste sus libros con un promedio de ${a.avg_rating}/5 en ${a.book_count} libros. Revisa otros títulos de este autor.`,
        genre: '—',
      });
    });
  }

  // 3. Continuar sagas
  if (ctx.sagas.length > 0) {
    ctx.sagas.forEach(s => {
      if (s.pending_books > 0) {
        suggestions.push({
          title: `Continúa la saga: ${s.name}`,
          author: '—',
          reason: `Has completado ${s.completed_books} libro(s) de esta saga y tienes ${s.pending_books} pendientes. Retoma donde lo dejaste.`,
          genre: '—',
        });
      }
    });
  }

  // 4. Ritmo de lectura
  if (ctx.readingPace && ctx.readingPace.total_sessions > 0) {
    suggestions.push({
      title: 'Define una meta de lectura',
      author: '—',
      reason: `Promedias ${ctx.readingPace.avg_pages_per_session} páginas por sesión de ${ctx.readingPace.avg_session_minutes} min. Busca un libro que se ajuste a tu ritmo.`,
      genre: '—',
    });
  }

  // 5. Genérico
  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Empieza a construir tu biblioteca',
      author: '—',
      reason: 'Agrega libros a tu lista de lectura y califícalos para obtener sugerencias personalizadas.',
      genre: '—',
    });
  }

  return suggestions.slice(0, 5);
}

function fallbackSpendingSuggestions(ctx) {
  const suggestions = [];
  const top = ctx.topCategories;

  // 1. Categoría principal
  if (top.length > 0) {
    const cat1 = top[0];
    const saveEstimate = (parseFloat(cat1.total) * 0.1).toFixed(2);
    suggestions.push({
      title: `Reduce gastos en ${cat1.category}`,
      description: `Tu categoría principal es "${cat1.category}" con S/ ${parseFloat(cat1.total).toFixed(2)} en los últimos ${ctx.periodMonths} meses. Reducir un 10% ahorraría ~S/ ${saveEstimate}.`,
      potentialSaving: parseFloat(saveEstimate),
    });

    if (top.length > 1) {
      const cat2 = top[1];
      const save2 = (parseFloat(cat2.total) * 0.1).toFixed(2);
      suggestions.push({
        title: `Recorta en ${cat2.category}`,
        description: `La segunda categoría más alta es "${cat2.category}" con S/ ${parseFloat(cat2.total).toFixed(2)}. Intenta presupuestar o buscar alternativas para ahorrar ~S/ ${save2}.`,
        potentialSaving: parseFloat(save2),
      });
    }
  }

  // 2. Préstamos activos
  if (ctx.activeLoans.length > 0) {
    const totalDebo = ctx.activeLoans
      .filter(l => parseFloat(l.balance) < 0)
      .reduce((s, l) => s + Math.abs(parseFloat(l.balance)), 0);
    const totalMeDeben = ctx.activeLoans
      .filter(l => parseFloat(l.balance) > 0)
      .reduce((s, l) => s + parseFloat(l.balance), 0);

    if (totalDebo > 0) {
      suggestions.push({
        title: 'Paga tus deudas',
        description: `Debes S/ ${totalDebo.toFixed(2)} a ${ctx.activeLoans.filter(l => parseFloat(l.balance) < 0).length} persona(s). Considera un plan de pago para reducir obligaciones.`,
        potentialSaving: Math.round(totalDebo * 0.05),
      });
    }
    if (totalMeDeben > 0) {
      suggestions.push({
        title: 'Cobra préstamos pendientes',
        description: `Te deben S/ ${totalMeDeben.toFixed(2)}. Dar seguimiento mejoraría tu flujo de efectivo.`,
        potentialSaving: Math.round(totalMeDeben * 0.02),
      });
    }
  }

  // 3. Metas de ahorro
  const activeGoals = ctx.savingsGoals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    activeGoals.forEach(g => {
      const remaining = parseFloat(g.target_amount) - parseFloat(g.current_amount);
      if (remaining > 0) {
        suggestions.push({
          title: `Impulsa tu ahorro: ${g.name}`,
          description: `Vas al ${g.progress_pct}% de tu meta "${g.name}" (faltan S/ ${remaining.toFixed(2)}). Aumentar las contribuciones mensuales te ayudará a llegar más rápido.`,
          potentialSaving: Math.round(remaining * 0.1),
        });
      }
    });
  }

  // 4. Gasto diario
  if (ctx.dailySpending && ctx.dailySpending.avg_daily > 0) {
    const avgDaily = parseFloat(ctx.dailySpending.avg_daily);
    const monthly30 = avgDaily * 30;
    suggestions.push({
      title: 'Controla tu gasto diario',
      description: `Tu gasto diario promedio es S/ ${avgDaily.toFixed(2)} (S/ ${monthly30.toFixed(2)}/mes). Reducir solo un 5% ahorra ~S/ ${(monthly30 * 0.05).toFixed(2)} al mes.`,
      potentialSaving: Math.round(monthly30 * 0.05),
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Empieza a registrar gastos',
      description: 'Agrega gastos e ingresos para obtener sugerencias de ahorro personalizadas.',
      potentialSaving: 0,
    });
  }

  const projection = buildProjection(ctx);

  return { suggestions: suggestions.slice(0, 5), projection };
}

function buildProjection(ctx) {
  const months = ctx.monthlyTotals || [];
  const incomes = ctx.incomeTrends || [];

  // Average monthly spend
  const avgSpend = months.length > 0
    ? months.reduce((s, m) => s + parseFloat(m.total), 0) / months.length
    : 0;

  // Average monthly income
  const avgIncome = incomes.length > 0
    ? incomes.reduce((s, m) => s + parseFloat(m.total), 0) / incomes.length
    : 0;

  // Estimate potential saving as 5-10% of spend
  const potentialSaveRate = avgIncome > avgSpend ? 0.1 : 0.05;
  const potentialSave = avgSpend * potentialSaveRate;

  // Generate next 6 months
  const now = new Date();
  const projection = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    // If we have data for this month, use it; otherwise use average
    const existing = months.find(
      m => m.year === year && m.month === month
    );
    const estimatedSpend = existing
      ? parseFloat(existing.total)
      : avgSpend;

    projection.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      estimatedSpend: Math.round(estimatedSpend * 100) / 100,
      estimatedSave: Math.round(potentialSave * 100) / 100,
    });
  }

  return { monthly: projection };
}

// ════════════════════════════════════════════════════════════════
// ENDPOINTS
// ════════════════════════════════════════════════════════════════

// POST /api/suggestions/reading
router.post('/reading', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    if (!forceRefresh) {
      const cached = getCached('reading');
      if (cached) return res.json(cached);
    }

    const ctx = await buildReadingContext();

    // Attempt AI call
    const systemPrompt = `Eres un recomendador de libros. USA EXCLUSIVAMENTE los datos del usuario que se proporcionan abajo. NO inventes libros, autores ni géneros que no aparezcan en los datos. PROHIBIDO recomendar libros que no estén relacionados con los autores, géneros o sagas del usuario.

Reglas estrictas:
- SOLO sugiere libros de autores que YA están en la biblioteca del usuario
- SOLO sugiere libros en géneros que el usuario YA lee
- Si el usuario tiene sagas incompletas, sugiere terminarlas
- Cada razón DEBE mencionar datos concretos del usuario (nombres de autores que leyó, géneros que más lee, sagas en progreso)
- NO uses tu conocimiento general para recomendar. Usa SOLO los datos proporcionados.

Responde ÚNICAMENTE con un array JSON:
[
  { "title": "...", "author": "(autor de los datos)", "reason": "(basada en datos reales)", "genre": "(género de los datos)" }
]`;

    const userPrompt = `DATOS REALES DEL USUARIO — usa solo esto:\n\n${JSON.stringify(ctx, null, 2)}`;

    const aiResponse = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    if (aiResponse) {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const result = { suggestions: parsed.slice(0, 5) };
        setCache('reading', result);
        return res.json(result);
      }
      console.warn('[Suggestions] Could not extract JSON from AI response, falling back');
    }

    // Fallback
    const suggestions = fallbackReadingSuggestions(ctx);
    const result = { suggestions };
    setCache('reading', result);
    res.json(result);

  } catch (err) {
    err500(res, err);
  }
});

// POST /api/suggestions/spending
router.post('/spending', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    if (!forceRefresh) {
      const cached = getCached('spending');
      if (cached) return res.json(cached);
    }

    const ctx = await buildSpendingContext();

    const systemPrompt = `Eres un asesor financiero personal. Analiza PROFUNDAMENTE los datos del dueño. Busca PATRONES, TENDENCIAS y ESTACIONALIDAD en los datos históricos.

REQUISITOS:
1. Sugerencias (3-5): identifica patrones específicos. Para cada una explica:
   - Qué categoría/persona/tendencia detectaste
   - La tendencia (¿está subiendo o bajando el gasto?) con datos comparativos (ej: "subió 40% vs hace 6 meses")
   - Una acción concreta con el ahorro estimado
   - Menciona meses específicos como ejemplo (ej: "en marzo 2026 gastaste S/ 4,293")

2. Proyección a 6 meses: analiza la TENDENCIA y ESTACIONALIDAD del historial completo.
   - Si hay meses que siempre son más altos (ej: diciembre), la proyección DEBE reflejarlo
   - Si la tendencia general es al alza, los meses futuros deben ser más altos que el promedio
   - Si es a la baja, deben ser más bajos
   - CADA MES debe ser DIFERENTE, reflejando patrones reales
   - NO pongas el mismo valor todos los meses

USA EXCLUSIVAMENTE los datos proporcionados. NO inventes nada. Sé específico con números, meses y nombres de los datos reales.

Responde ÚNICAMENTE con un objeto JSON válido:
{
  "suggestions": [
    { "title": "corto", "description": "explicación con datos reales", "potentialSaving": 000 }
  ],
  "projection": {
    "monthly": [
      { "month": "YYYY-MM", "estimatedSpend": 000, "estimatedSave": 000 }
    ]
  }
}`;

    const userPrompt = `Aquí están los datos financieros del usuario (últimos ${ctx.periodMonths} meses):\n\n${JSON.stringify(ctx, null, 2)}`;

    const aiResponse = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    if (aiResponse) {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const result = {
          suggestions: (parsed.suggestions || []).slice(0, 5),
          projection: parsed.projection || buildProjection(ctx),
        };
        setCache('spending', result);
        return res.json(result);
      }
      console.warn('[Suggestions] Could not extract JSON from AI response, falling back');
    }

    // Fallback
    const result = fallbackSpendingSuggestions(ctx);
    setCache('spending', result);
    res.json(result);

  } catch (err) {
    err500(res, err);
  }
});

module.exports = router;
