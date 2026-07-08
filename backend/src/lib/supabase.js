const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let client = null;

function getClient() {
  if (client) return client;
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error('Supabase no configurado: falta SUPABASE_URL o SUPABASE_SERVICE_KEY');
  }
  client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false },
  });
  return client;
}

module.exports = new Proxy({}, {
  get: (_target, prop) => getClient()[prop],
});
