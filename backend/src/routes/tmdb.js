const router = require('express').Router();
const tmdb = require('../tmdb');
const { authMiddleware } = require('../auth');

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q, type = 'multi' } = req.query;
    if (!q) return res.status(400).json({ error: 'Falta el parámetro q' });
    const data = await tmdb.search(q, type);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/movie/:id', authMiddleware, async (req, res) => {
  try {
    res.json(await tmdb.getMovie(req.params.id));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/tv/:id', authMiddleware, async (req, res) => {
  try {
    res.json(await tmdb.getTv(req.params.id));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/tv/:id/season/:n', authMiddleware, async (req, res) => {
  try {
    res.json(await tmdb.getSeason(req.params.id, req.params.n));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = router;
