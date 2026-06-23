const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [cinema, reading, spending] = await Promise.all([
      // Cinema: count by status
      db.query(`SELECT status, COUNT(*)::int AS count FROM cinema.items GROUP BY status`),
      // Reading: count by status
      db.query(`SELECT status, COUNT(*)::int AS count FROM reading.books GROUP BY status`),
      // Spending: current month total
      db.query(`SELECT COALESCE(SUM(amount), 0)::float AS total
        FROM spending.expenses
        WHERE date_trunc('month', transaction_date) = date_trunc('month', now())`)
    ]);

    const cinemaRows    = cinema.rows || [];
    const readingRows   = reading.rows || [];
    const spendingRow   = (spending.rows && spending.rows[0]) || { total: 0 };

    const cinemaWatching = cinemaRows.find(r => r.status === 'watching')?.count || 0;
    const cinemaWatched  = cinemaRows.find(r => r.status === 'watched')?.count || 0;

    const readingReading   = readingRows.find(r => r.status === 'reading')?.count || 0;
    const readingCompleted = readingRows.find(r => r.status === 'completed')?.count || 0;
    const readingQueued    = readingRows.find(r => r.status === 'queued')?.count || 0;

    const totalExpenses = spendingRow.total || 0;

    const modules = [
      {
        id: 'reading',
        name: 'Reading Journey',
        icon: 'book',
        route: '/reading',
        status: readingReading > 0
          ? `${readingReading} book${readingReading !== 1 ? 's' : ''} in progress`
          : `${readingCompleted} completed`,
        color: 'rose',
      },
      {
        id: 'cinema',
        name: 'Cinema & TV',
        icon: 'film',
        route: '/cinema',
        status: cinemaWatching > 0
          ? `${cinemaWatching} in progress`
          : `${cinemaWatched} watched`,
        color: 'green',
      },
      {
        id: 'spending',
        name: 'Spending Tracker',
        icon: 'wallet',
        route: '/spending',
        status: totalExpenses > 0
          ? `$${totalExpenses.toFixed(0)} this month`
          : 'No expenses yet',
        color: 'purple',
      },
      {
        id: 'growth',
        name: 'Personal Growth',
        icon: 'chart',
        route: '/growth',
        status: 'Track your goals',
        color: 'blue',
      },
      {
        id: 'mindfulness',
        name: 'Mindfulness',
        icon: 'leaf',
        route: '/mindfulness',
        status: 'Daily practice',
        color: 'teal',
      },
    ];

    res.json({ modules });
  } catch (err) {
    console.error('[Modules] Error fetching stats:', err.message);
    // Fallback: return static data if DB query fails
    const modules = [
      { id: 'reading', name: 'Reading Journey', icon: 'book', route: '/reading', status: 'Track your books', color: 'rose' },
      { id: 'cinema', name: 'Cinema & TV', icon: 'film', route: '/cinema', status: 'Track your shows', color: 'green' },
      { id: 'spending', name: 'Spending Tracker', icon: 'wallet', route: '/spending', status: 'Track your finances', color: 'purple' },
      { id: 'growth', name: 'Personal Growth', icon: 'chart', route: '/growth', status: 'Track your goals', color: 'blue' },
      { id: 'mindfulness', name: 'Mindfulness', icon: 'leaf', route: '/mindfulness', status: 'Daily practice', color: 'teal' },
    ];
    res.json({ modules });
  }
});

module.exports = router;
