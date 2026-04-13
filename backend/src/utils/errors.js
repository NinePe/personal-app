const err500 = (res, err) => {
  console.error('[API Error]', err.message || err);
  res.status(500).json({ error: 'Internal server error' });
};

module.exports = { err500 };
