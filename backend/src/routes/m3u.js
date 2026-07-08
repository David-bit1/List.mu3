const router = require('express').Router();
const m3u = require('../lib/m3u');

const allowed = new Set(['movies', 'series', 'tv', 'all']);

router.get('/', async (req, res) => {
  try {
    const { content } = await m3u.generateUltra();
    res.setHeader('Content-Type', 'application/x-mpegURL; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="ultrapelis.m3u"');
    res.send(content);
  } catch (e) {
    console.error('[m3u] fallo total al generar:', e.message);
    res.setHeader('Content-Type', 'application/x-mpegURL; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="ultrapelis.m3u"');
    res.send('#EXTM3U\n');
  }
});

router.get('/:type', async (req, res) => {
  if (!allowed.has(req.params.type)) {
    return res.status(400).json({ error: 'Tipo de playlist inválido (movies|series|tv|all)' });
  }
  try {
    const { file, content } = await m3u.generate(req.params.type);
    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.send(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
