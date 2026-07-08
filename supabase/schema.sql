-- ============================================================
-- Esquema para panel de catálogo multimedia + generador M3U
-- Postgres / Supabase
-- ============================================================

create extension if not exists "pgcrypto";

-- -------------------- Catálogos --------------------

create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  created_at timestamptz default now()
);

create table if not exists genres (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null
);

create table if not exists servers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- -------------------- Películas --------------------

create table if not exists movies (
  id           uuid primary key default gen_random_uuid(),
  tmdb_id      integer unique not null,
  title        text not null,
  original_title text,
  synopsis     text,
  year         integer,
  duration     integer,
  country      text,
  certification text,
  rating       numeric(3,1),
  poster_path  text,
  backdrop_path text,
  category_id  uuid references categories(id),
  active       boolean default true,
  created_at   timestamptz default now()
);

create table if not exists movie_genres (
  movie_id uuid references movies(id) on delete cascade,
  genre_id uuid references genres(id) on delete cascade,
  primary key (movie_id, genre_id)
);

create table if not exists movie_servers (
  id          uuid primary key default gen_random_uuid(),
  movie_id    uuid references movies(id) on delete cascade,
  server_id   uuid references servers(id),
  url         text not null,
  status      text default 'unknown',
  last_checked timestamptz,
  created_at  timestamptz default now(),
  unique (movie_id, server_id, url)
);

-- -------------------- Series --------------------

create table if not exists series (
  id            uuid primary key default gen_random_uuid(),
  tmdb_id       integer unique not null,
  title         text not null,
  original_title text,
  synopsis      text,
  year          integer,
  country       text,
  certification text,
  rating        numeric(3,1),
  poster_path   text,
  backdrop_path text,
  category_id   uuid references categories(id),
  active        boolean default true,
  created_at    timestamptz default now()
);

create table if not exists series_genres (
  series_id uuid references series(id) on delete cascade,
  genre_id  uuid references genres(id) on delete cascade,
  primary key (series_id, genre_id)
);

create table if not exists seasons (
  id            uuid primary key default gen_random_uuid(),
  series_id     uuid references series(id) on delete cascade,
  season_number integer not null,
  title         text,
  poster_path   text,
  tmdb_id       integer,
  unique (series_id, season_number)
);

create table if not exists episodes (
  id             uuid primary key default gen_random_uuid(),
  season_id      uuid references seasons(id) on delete cascade,
  episode_number integer not null,
  title          text,
  tmdb_id        integer,
  still_path     text,
  synopsis       text,
  duration       integer,
  air_date       date,
  unique (season_id, episode_number)
);

create table if not exists episode_servers (
  id           uuid primary key default gen_random_uuid(),
  episode_id   uuid references episodes(id) on delete cascade,
  server_id    uuid references servers(id),
  url          text not null,
  status       text default 'unknown',
  last_checked timestamptz,
  created_at   timestamptz default now(),
  unique (episode_id, server_id, url)
);

-- -------------------- TV en Vivo --------------------

create table if not exists channels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo        text,
  group_title text,
  country     text,
  language    text,
  stream      text not null,
  tvg_id      text,
  tvg_name    text,
  status      text default 'unknown',
  last_checked timestamptz,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- -------------------- Playlists (log de generación) --------------------

create table if not exists playlists (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  items         integer not null default 0,
  generated_at  timestamptz default now()
);

-- -------------------- Índices --------------------

create index if not exists idx_movies_active  on movies(active);
create index if not exists idx_series_active  on series(active);
create index if not exists idx_channels_active on channels(active);
create index if not exists idx_episodes_season on episodes(season_id);
create index if not exists idx_movie_servers_movie on movie_servers(movie_id);
create index if not exists idx_ep_servers_ep on episode_servers(episode_id);

-- -------------------- Categorías iniciales --------------------

insert into categories (name, slug) values
  ('Películas',   'peliculas'),
  ('Series',      'series'),
  ('Anime',       'anime'),
  ('Documentales','documentales'),
  ('Deportes',    'deportes'),
  ('Infantil',    'infantil'),
  ('Música',      'musica'),
  ('TV en Vivo',  'tv-en-vivo')
on conflict (slug) do nothing;
