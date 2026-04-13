-- ============================================================
-- Reading sessions + yearly goals
-- ============================================================

-- Each row = one timed reading session on a specific book.
-- start_page → end_page gives pages read that session.
-- ended_at - started_at gives the duration.
CREATE TABLE IF NOT EXISTS reading.reading_sessions (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid          NOT NULL REFERENCES reading.books(id) ON DELETE CASCADE,
  started_at  timestamptz   NOT NULL,
  ended_at    timestamptz   NOT NULL,
  start_page  int           NOT NULL,
  end_page    int           NOT NULL,
  notes       text,
  created_at  timestamptz   DEFAULT now(),
  CHECK (ended_at >= started_at),
  CHECK (end_page >= start_page)
);
CREATE INDEX IF NOT EXISTS idx_sessions_book ON reading.reading_sessions(book_id, started_at DESC);

-- One goal per year. Upserted on edit.
CREATE TABLE IF NOT EXISTS reading.reading_goals (
  year        int           PRIMARY KEY,
  goal        int           NOT NULL CHECK (goal > 0),
  created_at  timestamptz   DEFAULT now(),
  updated_at  timestamptz   DEFAULT now()
);
