const router = require('express').Router();
const supabase = require('../lib/supabase');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.stream) return res.status(400).json({ error: 'Falta name o stream' });

  const { data, error } = await supabase
    .from('channels')
    .insert({
      name: b.name,
      logo: b.logo,
      group_title: b.group_title,
      country: b.country,
      language: b.language,
      stream: b.stream,
      tvg_id: b.tvg_id,
      tvg_name: b.tvg_name,
      active: b.active !== false,
    })
    .select('id')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { error } = await supabase.from('channels').update(req.body).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('channels').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
