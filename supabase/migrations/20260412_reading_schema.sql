-- ============================================================
-- READING MODULE SCHEMA — separate from spending
-- ============================================================
-- Personal library: books + authors + genres + sagas + formats + types.

CREATE SCHEMA IF NOT EXISTS reading;

-- ── Authors master ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading.authors (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text          NOT NULL,
  gender       text          CHECK (gender IN ('female','male','non_binary','trans','other')),
  origin_place text,
  notes        text,
  created_at   timestamptz   DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reading_authors_name ON reading.authors(lower(name));

-- ── Genres master ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading.genres (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text          NOT NULL UNIQUE,
  created_at  timestamptz   DEFAULT now()
);

-- ── Formats master (DB-seeded, read-only on the frontend) ─────
CREATE TABLE IF NOT EXISTS reading.formats (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text          NOT NULL UNIQUE,
  sort_order  int           DEFAULT 0,
  created_at  timestamptz   DEFAULT now()
);

-- ── Book types master (DB-seeded) ─────────────────────────────
CREATE TABLE IF NOT EXISTS reading.book_types (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text          NOT NULL UNIQUE,
  icon        text,
  sort_order  int           DEFAULT 0,
  created_at  timestamptz   DEFAULT now()
);

-- ── Sagas master ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading.sagas (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text          NOT NULL UNIQUE,
  description text,
  created_at  timestamptz   DEFAULT now()
);

-- ── Books (main entity) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading.books (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text          NOT NULL,
  subtitle      text,
  publisher     text,
  page_count    int,
  current_page  int           DEFAULT 0,
  cover_url     text,
  is_physical   boolean       NOT NULL DEFAULT false,
  status        text          NOT NULL DEFAULT 'queued'
                CHECK (status IN ('reading','queued','completed','paused','dropped')),
  rating        numeric(2,1)  CHECK (rating >= 0 AND rating <= 5),
  notes         text,
  summary       text,
  format_id     uuid          REFERENCES reading.formats(id)    ON DELETE SET NULL,
  book_type_id  uuid          REFERENCES reading.book_types(id) ON DELETE SET NULL,
  saga_id       uuid          REFERENCES reading.sagas(id)      ON DELETE SET NULL,
  saga_volume   int,
  started_at    date,
  finished_at   date,
  created_at    timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reading_books_status ON reading.books(status);
CREATE INDEX IF NOT EXISTS idx_reading_books_saga   ON reading.books(saga_id);

-- ── Junctions: book ↔ authors, book ↔ genres ──────────────────
CREATE TABLE IF NOT EXISTS reading.book_authors (
  book_id   uuid NOT NULL REFERENCES reading.books(id)   ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES reading.authors(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, author_id)
);

CREATE TABLE IF NOT EXISTS reading.book_genres (
  book_id  uuid NOT NULL REFERENCES reading.books(id)  ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES reading.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, genre_id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO reading.formats (name, sort_order) VALUES
  ('Hardcover', 1),
  ('Paperback', 2),
  ('Pocket',    3),
  ('Special Edition', 4),
  ('Digital / Kindle', 5),
  ('Audiobook', 6)
ON CONFLICT (name) DO NOTHING;

INSERT INTO reading.book_types (name, icon, sort_order) VALUES
  ('Book',          'menu_book',      1),
  ('Manga',         'import_contacts', 2),
  ('Comic',         'photo_album',    3),
  ('Graphic Novel', 'palette',        4),
  ('Light Novel',   'auto_stories',   5),
  ('Poetry',        'edit_note',      6),
  ('Essay',         'article',        7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO reading.genres (name) VALUES
  ('Fiction'),
  ('Non-fiction'),
  ('Fantasy'),
  ('Sci-Fi'),
  ('Mystery'),
  ('Thriller'),
  ('Romance'),
  ('Horror'),
  ('Biography'),
  ('History'),
  ('Philosophy'),
  ('Self-help'),
  ('Poetry'),
  ('Classic'),
  ('Young Adult'),
  ('Drama')
ON CONFLICT (name) DO NOTHING;
