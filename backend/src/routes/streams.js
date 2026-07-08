const router = require('express').Router();
const { authMiddleware } = require('../auth');
const { checkAll } = require('../streamChecker');

router.use(authMiddleware);

router.post('/check', async (req, res) => {
  try {
    const result = await checkAll();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
