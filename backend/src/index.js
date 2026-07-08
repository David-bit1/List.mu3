const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`Panel IPTV escuchando en http://localhost:${config.port}`);
});
