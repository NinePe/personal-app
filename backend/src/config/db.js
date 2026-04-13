const { Pool } = require('pg');
require('dotenv').config();

console.log('[DB Config]', {
  host: process.env.DB_HOST || '(default)',
  port: process.env.DB_PORT || '(default)',
  user: process.env.DB_USER || '(default)',
  database: process.env.DB_NAME || '(default)',
  hasPassword: !!process.env.DB_PASSWORD,
});

const pool = new Pool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT || '54322'),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME     || 'postgres',
});

pool.on('error', (err) => console.error('DB pool error:', err));

module.exports = pool;
