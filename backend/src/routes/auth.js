const router = require('express').Router();
const { signToken } = require('../auth');
const config = require('../config');

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== config.adminUser || password !== config.adminPass) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  res.json({ token: signToken(username) });
});

module.exports = router;
