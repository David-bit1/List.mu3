const API = {
  token: localStorage.getItem('iptv_token') || '',

  setToken(t) {
    this.token = t;
    localStorage.setItem('iptv_token', t);
  },
  logout() {
    this.token = '';
    localStorage.removeItem('iptv_token');
  },
  async req(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (this.token) opts.headers.Authorization = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch('/api' + url, opts);
    if (res.status === 401) {
      this.logout();
      location.reload();
      throw new Error('No autorizado');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Error ' + res.status);
    return data;
  },

  login: (u, p) => API.req('POST', '/auth/login', { username: u, password: p }),
  stats: () => API.req('GET', '/dashboard/stats'),

  tmdbSearch: (q, type = 'multi') => API.req('GET', `/tmdb/search?q=${encodeURIComponent(q)}&type=${type}`),
  tmdbMovie: (id) => API.req('GET', `/tmdb/movie/${id}`),
  tmdbTv: (id) => API.req('GET', `/tmdb/tv/${id}`),
  tmdbSeason: (id, n) => API.req('GET', `/tmdb/tv/${id}/season/${n}`),

  listMovies: () => API.req('GET', '/movies'),
  createMovie: (b) => API.req('POST', '/movies', b),
  addMovieServer: (id, b) => API.req('POST', `/movies/${id}/servers`, b),
  delMovie: (id) => API.req('DELETE', `/movies/${id}`),

  listSeries: () => API.req('GET', '/series'),
  getSeries: (id) => API.req('GET', `/series/${id}`),
  createSeries: (b) => API.req('POST', '/series', b),
  addSeason: (id, b) => API.req('POST', `/series/${id}/seasons`, b),
  addEpisode: (seasonId, b) => API.req('POST', `/series/${id}/seasons/${seasonId}/episodes`, b),
  addEpServer: (epId, b) => API.req('POST', `/series/episodes/${epId}/servers`, b),
  delSeries: (id) => API.req('DELETE', `/series/${id}`),

  listChannels: () => API.req('GET', '/channels'),
  createChannel: (b) => API.req('POST', '/channels', b),
  updateChannel: (id, b) => API.req('PUT', `/channels/${id}`, b),
  delChannel: (id) => API.req('DELETE', `/channels/${id}`),

  checkStreams: () => API.req('POST', '/streams/check'),
};

function img(path, size = 'w500') {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function m3uUrl(type) {
  return `/api/m3u/${type}`;
}
