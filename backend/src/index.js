require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const modulesRouter        = require('./routes/modules');
const spendingCards        = require('./routes/spending/cards');
const spendingPeople       = require('./routes/spending/people');
const spendingPlaces       = require('./routes/spending/places');
const spendingCategories   = require('./routes/spending/categories');
const spendingExpenses     = require('./routes/spending/expenses');
const spendingBudget       = require('./routes/spending/budget');
const spendingIncome       = require('./routes/spending/income');
const spendingSavings      = require('./routes/spending/savings');
const spendingLoans        = require('./routes/spending/loans');
const spendingProjections  = require('./routes/spending/projections');
const readingRouter        = require('./routes/reading');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: false, // disabled for API-only server
}));

// ── CORS ───────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // generous limit for a personal app
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/modules',             modulesRouter);
app.use('/api/spending/cards',      spendingCards);
app.use('/api/spending/people',     spendingPeople);
app.use('/api/spending/places',     spendingPlaces);
app.use('/api/spending/categories', spendingCategories);
app.use('/api/spending/expenses',   spendingExpenses);
app.use('/api/spending/budget',     spendingBudget);
app.use('/api/spending/income',     spendingIncome);
app.use('/api/spending/savings',    spendingSavings);
app.use('/api/spending/loans',      spendingLoans);
app.use('/api/spending/projections', spendingProjections);
app.use('/api/reading',              readingRouter);

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
