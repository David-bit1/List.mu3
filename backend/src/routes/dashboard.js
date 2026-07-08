const router = require('express').Router();
const supabase = require('../supabase');
const { authMiddleware } = require('../auth');

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
  const [movies, series, channels] = await Promise.all([
    supabase.from('movies').select('id', { count: 'exact', head: true }),
    supabase.from('series').select('id', { count: 'exact', head: true }),
    supabase.from('channels').select('id', { count: 'exact', head: true }),
  ]);

  const countBy = async (table) => {
    const { data } = await supabase.from(table).select('status');
    return (data || []).reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  };
  const [ms, es, ch, last] = await Promise.all([
    countBy('movie_servers'),
    countBy('episode_servers'),
    countBy('channels'),
    supabase.from('playlists').select('generated_at').order('generated_at', { ascending: false }).limit(1),
  ]);

  const active = (ms.active || 0) + (es.active || 0) + (ch.active || 0);
  const down = (ms.down || 0) + (es.down || 0) + (ch.down || 0);

  res.json({
    movies: movies.count || 0,
    series: series.count || 0,
    channels: channels.count || 0,
    streamsActive: active,
    streamsDown: down,
    lastUpdate: last.data?.[0]?.generated_at || null,
  });
});

module.exports = router;
