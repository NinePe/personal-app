-- CINEMA SCHEMA -- movies + series tracking
DROP SCHEMA IF EXISTS cinema CASCADE;
CREATE SCHEMA IF NOT EXISTS cinema;

CREATE TABLE IF NOT EXISTS cinema.items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id         integer NOT NULL,
  media_type      text NOT NULL CHECK (media_type IN ('movie','tv')),
  title           text NOT NULL,
  original_title  text,
  overview        text,
  poster_path     text,
  backdrop_path   text,
  release_date    date,
  first_air_date  date,
  status          text DEFAULT 'watchlist' CHECK (status IN ('watchlist','watching','watched','dropped')),
  rating          numeric(2,1),
  comments        text,
  country         text,
  language        text,
  runtime         integer,
  number_of_seasons integer,
  number_of_episodes integer,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cinema.genres (
  id     integer PRIMARY KEY,
  name   text NOT NULL
);

CREATE TABLE IF NOT EXISTS cinema.item_genres (
  item_id   uuid REFERENCES cinema.items(id) ON DELETE CASCADE,
  genre_id  integer REFERENCES cinema.genres(id),
  PRIMARY KEY (item_id, genre_id)
);

CREATE TABLE IF NOT EXISTS cinema.directors (
  id         integer PRIMARY KEY,
  name       text NOT NULL,
  photo_path text
);

CREATE TABLE IF NOT EXISTS cinema.item_directors (
  item_id     uuid REFERENCES cinema.items(id) ON DELETE CASCADE,
  director_id integer REFERENCES cinema.directors(id),
  PRIMARY KEY (item_id, director_id)
);

CREATE TABLE IF NOT EXISTS cinema.seasons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES cinema.items(id) ON DELETE CASCADE,
  season_number   integer NOT NULL,
  name            text,
  overview        text,
  poster_path     text,
  episode_count   integer DEFAULT 0,
  watched_episodes integer DEFAULT 0,
  UNIQUE (item_id, season_number)
);

CREATE TABLE IF NOT EXISTS cinema.episodes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id      uuid NOT NULL REFERENCES cinema.seasons(id) ON DELETE CASCADE,
  episode_number integer NOT NULL,
  name           text,
  overview       text,
  still_path     text,
  runtime        integer,
  air_date       date,
  watched        boolean DEFAULT false,
  watched_at     timestamptz,
  UNIQUE (season_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_cinema_items_status ON cinema.items(status);
CREATE INDEX IF NOT EXISTS idx_cinema_items_type ON cinema.items(media_type);
CREATE INDEX IF NOT EXISTS idx_cinema_items_tmdb ON cinema.items(tmdb_id, media_type);
