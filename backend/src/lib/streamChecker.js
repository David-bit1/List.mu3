const supabase = require('./supabase');

async function checkUrl(url, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return res.status < 400 ? 'active' : 'down';
  } catch {
    return 'down';
  }
}

async function updateStatus(table, id, status) {
  await supabase.from(table).update({ status, last_checked: new Date().toISOString() }).eq('id', id);
}

async function checkAll() {
  const result = { checked: 0, down: 0 };

  const tables = ['movie_servers', 'episode_servers', 'channels'];
  for (const table of tables) {
    const { data } = await supabase.from(table).select('id, url' + (table === 'channels' ? '' : ''));
    for (const row of data || []) {
      const status = await checkUrl(row.url);
      await updateStatus(table, row.id, status);
      result.checked++;
      if (status === 'down') result.down++;
    }
  }
  return result;
}

module.exports = { checkUrl, checkAll };
