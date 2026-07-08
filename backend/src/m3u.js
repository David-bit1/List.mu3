const supabase = require('./supabase');

function esc(str = '') {
  return String(str).replace(/,/g, ';').replace(/[\r\n]+/g, ' ').trim();
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function tmdbLogo(path) {
  return path ? `https://image.tmdb.org/t/p/w500${path}` : '';
}

function render(entries) {
  let out = '#EXTM3U\n\n';
  for (const e of entries) out += `${e.extinf}\n${e.url}\n\n`;
  return out;
}

function dedup(entries) {
  const seen = new Set();
  return entries.filter((e) => {
    if (!e.url || seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}

async function movieEntries() {
  const { data, error } = await supabase
    .from('movies')
    .select('title, tmdb_id, poster_path, category:categories(name), movie_servers(url, status)')
    .eq('active', true);
  if (error) throw error;

  const out = [];
  for (const m of data || []) {
    const group = m.category?.name || 'Películas';
    const logo = tmdbLogo(m.poster_path);
    for (const s of m.movie_servers || []) {
      if (!s.url || s.status === 'down') continue;
      out.push({
        extinf: `#EXTINF:-1 tvg-id="${m.tmdb_id || ''}" tvg-name="${esc(m.title)}" tvg-logo="${logo}" group-title="${esc(group)}",${esc(m.title)}`,
        url: s.url,
      });
    }
  }
  return out;
}

async function seriesEntries() {
  const { data: eps, error } = await supabase
    .from('episodes')
    .select(
      'episode_number, title, season:seasons(season_number, series:series(title, tmdb_id, poster_path, active))'
    )
    .eq('season.series.active', true);
  if (error) throw error;

  const { data: servers, error: e2 } = await supabase.from('episode_servers').select('episode_id, url, status');
  if (e2) throw e2;

  const byEp = {};
  for (const s of servers || []) (byEp[s.episode_id] ||= []).push(s);

  const out = [];
  for (const ep of eps || []) {
    const season = ep.season;
    if (!season || !season.series) continue;
    const series = season.series;
    const logo = tmdbLogo(series.poster_path);
    const name = `${series.title} - T${pad(season.season_number)}E${pad(ep.episode_number)} - ${ep.title || 'Episodio ' + ep.episode_number}`;
    for (const s of byEp[ep.id] || []) {
      if (!s.url || s.status === 'down') continue;
      out.push({
        extinf: `#EXTINF:-1 tvg-id="${series.tmdb_id || ''}" tvg-name="${esc(name)}" tvg-logo="${logo}" group-title="${esc('Series')}",${esc(name)}`,
        url: s.url,
      });
    }
  }
  return out;
}

async function channelEntries() {
  const { data, error } = await supabase
    .from('channels')
    .select('name, logo, tvg_id, tvg_name, group_title, stream')
    .eq('active', true);
  if (error) throw error;

  return (data || [])
    .filter((c) => c.stream)
    .map((c) => ({
      extinf: `#EXTINF:-1 tvg-id="${esc(c.tvg_id)}" tvg-name="${esc(c.tvg_name || c.name)}" tvg-logo="${esc(c.logo)}" group-title="${esc(c.group_title || 'TV en Vivo')}",${esc(c.name)}`,
      url: c.stream,
    }));
}

const sectionLoaders = {
  películas: movieEntries,
  series: seriesEntries,
  canales: channelEntries,
};

async function loadSections(keys) {
  const results = await Promise.allSettled(keys.map((k) => sectionLoaders[k]()));
  const entries = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') entries.push(...r.value);
    else errors.push(`${keys[i]}: ${r.reason?.message || r.reason}`);
  });
  return { entries, errors };
}

async function buildCombined() {
  const { entries, errors } = await loadSections(['películas', 'series', 'canales']);
  const unique = dedup(entries);
  return { content: render(unique), items: unique.length, errors };
}

const builders = {
  movies: { fn: movieEntries, file: 'movies.m3u' },
  series: { fn: seriesEntries, file: 'series.m3u' },
  tv: { fn: channelEntries, file: 'tv.m3u' },
  all: { fn: null, file: 'todo.m3u' },
};

async function generate(type) {
  const b = builders[type];
  if (!b) throw new Error('Tipo de playlist inválido');

  let entries = [];
  if (type === 'all') {
    const { entries: e } = await loadSections(['películas', 'series', 'canales']);
    entries = e;
  } else {
    entries = await b.fn();
  }

  const unique = dedup(entries);
  const content = render(unique);
  const items = (content.match(/^#EXTINF:/gm) || []).length;
  await supabase.from('playlists').insert({ type, items });
  return { file: b.file, content, items };
}

async function generateUltra() {
  const { content, items, errors } = await buildCombined();
  if (errors.length) console.error('[m3u] secciones con error:', errors);
  return { content, items };
}

module.exports = { generate, generateUltra };
