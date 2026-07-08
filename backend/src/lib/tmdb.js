const config = require('../config');

async function tmdbFetch(path, params = {}) {
  const url = new URL(config.tmdbBase + path);
  url.searchParams.set('api_key', config.tmdbApiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TMDb ${res.status}: ${body}`);
  }
  return res.json();
}

function img(path, size = 'w500') {
  if (!path) return '';
  return `${config.tmdbImg}/${size}${path}`;
}

async function search(query, type = 'multi') {
  const endpoint =
    type === 'movie' ? '/search/movie' :
    type === 'tv' ? '/search/tv' :
    '/search/multi';
  return tmdbFetch(endpoint, { query, include_adult: false, language: 'es-ES' });
}

async function getMovie(id) {
  return tmdbFetch(`/movie/${id}`, { language: 'es-ES', append_to_response: 'credits' });
}

async function getTv(id) {
  return tmdbFetch(`/tv/${id}`, { language: 'es-ES', append_to_response: 'credits' });
}

async function getSeason(tvId, seasonNumber) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, { language: 'es-ES' });
}

module.exports = { search, getMovie, getTv, getSeason, img, tmdbFetch };
