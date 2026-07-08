const router = require('express').Router();
const supabase = require('../lib/supabase');
const { authMiddleware } = require('../middleware/auth');
const { upsertGenres, getOrCreateServer, setGenres } = require('../lib/helpers');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, year, rating, active, poster_path, category:categories(name), movie_servers(status)')
    .order('title');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('movies')
    .select('*, category:categories(name), movie_genres(genre:genres(name)), movie_servers(id, url, status, server:servers(name))')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const { data: movie, error } = await supabase
    .from('movies')
    .upsert({ ...b, tmdb_id: b.tmdb_id }, { onConflict: 'tmdb_id' })
    .select('id')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  if (Array.isArray(b.genres)) {
    const ids = await upsertGenres(b.genres);
    await setGenres('movie_genres', movie.id, ids);
  }
  if (b.stream) {
    const serverId = await getOrCreateServer(b.serverName || 'Servidor 1');
    const { error: e2 } = await supabase
      .from('movie_servers')
      .insert({ movie_id: movie.id, server_id: serverId, url: b.stream });
    if (e2) return res.status(500).json({ error: e2.message });
  }
  res.status(201).json(movie);
});

router.put('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('movies')
    .update(req.body)
    .eq('id', req.params.id)
    .select('id')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('movies').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.post('/:id/servers', async (req, res) => {
  const { url, serverName } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Falta la url' });

  const { data: existing } = await supabase
    .from('movie_servers')
    .select('id')
    .eq('movie_id', req.params.id)
    .eq('url', url)
    .maybeSingle();
  if (existing) return res.status(409).json({ error: 'Ese enlace ya existe para esta película' });

  const serverId = await getOrCreateServer(serverName || 'Servidor 1');
  const { data, error } = await supabase
    .from('movie_servers')
    .insert({ movie_id: req.params.id, server_id: serverId, url })
    .select('id, url, status')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.delete('/servers/:serverId', async (req, res) => {
  const { error } = await supabase.from('movie_servers').delete().eq('id', req.params.serverId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
