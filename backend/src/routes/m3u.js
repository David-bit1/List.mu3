const router = require('express').Router();
const m3u = require('../lib/m3u');

const allowed = new Set(['movies', 'series', 'tv', 'all']);
const filenameMap = { movies: 'movies.m3u', series: 'series.m3u', tv: 'tv.m3u', all: 'ultrapelis.m3u' };

function setM3UHeaders(res, download = false, filename = 'ultrapelis.m3u') {
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
  if (download) {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }
}

router.get('/', async (req, res) => {
  try {
    const { content } = await m3u.generateUltra();
    setM3UHeaders(res, req.query.download === '1', 'ultrapelis.m3u');
    res.send(content);
  } catch (e) {
    console.error('[m3u] fallo total al generar:', e.message);
    setM3UHeaders(res, req.query.download === '1', 'ultrapelis.m3u');
    res.send('#EXTM3U\n');
  }
});

router.get('/download', async (req, res) => {
  try {
    const { content } = await m3u.generateUltra();
    setM3UHeaders(res, true, 'ultrapelis.m3u');
    res.send(content);
  } catch (e) {
    console.error('[m3u] fallo total al generar:', e.message);
    setM3UHeaders(res, true, 'ultrapelis.m3u');
    res.send('#EXTM3U\n');
  }
});

router.get('/:type', async (req, res) => {
  if (!allowed.has(req.params.type)) {
    return res.status(400).json({ error: 'Tipo de playlist inválido (movies|series|tv|all)' });
  }
  try {
    const { content } = await m3u.generate(req.params.type);
    setM3UHeaders(res, req.query.download === '1', filenameMap[req.params.type]);
    res.send(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:type/download', async (req, res) => {
  if (!allowed.has(req.params.type)) {
    return res.status(400).json({ error: 'Tipo de playlist inválido (movies|series|tv|all)' });
  }
  try {
    const { content } = await m3u.generate(req.params.type);
    setM3UHeaders(res, true, filenameMap[req.params.type]);
    res.send(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
