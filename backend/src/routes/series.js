const router = require('express').Router();
const supabase = require('../lib/supabase');
const { authMiddleware } = require('../middleware/auth');
const { upsertGenres, getOrCreateServer, setGenres } = require('../lib/helpers');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('series')
    .select('id, title, year, rating, active, poster_path, category:categories(name)')
    .order('title');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('series')
    .select('*, category:categories(name), series_genres(genre:genres(name)), seasons(id, season_number, title, poster_path, episodes(id, episode_number, title, still_path, tmdb_id))')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const seriesData = {
    tmdb_id: b.tmdb_id,
    title: b.title,
    original_title: b.original_title,
    synopsis: b.synopsis,
    year: b.year,
    country: b.country,
    certification: b.certification,
    rating: b.rating,
    poster_path: b.poster_path,
    backdrop_path: b.backdrop_path,
    category_id: b.category_id,
    active: b.active !== false,
  };
  const { data: series, error } = await supabase
    .from('series')
    .upsert(seriesData, { onConflict: 'tmdb_id' })
    .select('id')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  if (Array.isArray(b.genres)) {
    const ids = await upsertGenres(b.genres);
    await setGenres('series_genres', series.id, ids);
  }
  res.status(201).json(series);
});

router.post('/:id/seasons', async (req, res) => {
  const b = req.body || {};
  const { data, error } = await supabase
    .from('seasons')
    .upsert({ series_id: req.params.id, season_number: b.season_number, title: b.title, poster_path: b.poster_path, tmdb_id: b.tmdb_id }, { onConflict: 'series_id,season_number' })
    .select('id')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.post('/:id/seasons/:seasonId/episodes', async (req, res) => {
  const b = req.body || {};
  const { data: ep, error } = await supabase
    .from('episodes')
    .upsert({ season_id: req.params.seasonId, episode_number: b.episode_number, title: b.title, tmdb_id: b.tmdb_id, still_path: b.still_path, synopsis: b.synopsis, duration: b.duration, air_date: b.air_date }, { onConflict: 'season_id,episode_number' })
    .select('id')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  if (b.stream) {
    const serverId = await getOrCreateServer(b.serverName || 'Servidor 1');
    const { error: e2 } = await supabase
      .from('episode_servers')
      .insert({ episode_id: ep.id, server_id: serverId, url: b.stream });
    if (e2) return res.status(500).json({ error: e2.message });
  }
  res.status(201).json(ep);
});

router.post('/episodes/:episodeId/servers', async (req, res) => {
  const { url, serverName } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Falta la url' });

  const { data: existing } = await supabase
    .from('episode_servers')
    .select('id')
    .eq('episode_id', req.params.episodeId)
    .eq('url', url)
    .maybeSingle();
  if (existing) return res.status(409).json({ error: 'Ese enlace ya existe para este episodio' });

  const serverId = await getOrCreateServer(serverName || 'Servidor 1');
  const { data, error } = await supabase
    .from('episode_servers')
    .insert({ episode_id: req.params.episodeId, server_id: serverId, url })
    .select('id, url, status')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('series').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
