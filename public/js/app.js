const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  setTimeout(() => t.classList.add('hidden'), 3000);
}
function statusBadge(s) {
  const cls = s === 'active' ? 'ok' : s === 'down' ? 'down' : 'unknown';
  return `<span class="badge ${cls}">${esc(s || 'unknown')}</span>`;
}
function modal(html) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="box">${html}</div>`;
  m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
  return m;
}

const titles = { dashboard: 'Dashboard', movies: 'Películas', series: 'Series', channels: 'TV en Vivo', tmdb: 'Buscar en TMDb', m3u: 'Generar M3U' };

function setView(name) {
  $('#viewTitle').textContent = titles[name] || '';
  $$('.sidebar nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === name));
  const fn = views[name] || views.dashboard;
  $('#view').innerHTML = '';
  fn($('#view'));
}

const views = {
  dashboard(view) {
    API.stats().then((s) => {
      view.innerHTML = `
        <div class="stats">
          <div class="stat"><div class="n">${s.movies}</div><div class="l">Películas</div></div>
          <div class="stat"><div class="n">${s.series}</div><div class="l">Series</div></div>
          <div class="stat"><div class="n">${s.channels}</div><div class="l">Canales</div></div>
          <div class="stat ok"><div class="n">${s.streamsActive}</div><div class="l">Streams activos</div></div>
          <div class="stat down"><div class="n">${s.streamsDown}</div><div class="l">Streams caídos</div></div>
        </div>
        <div class="row" style="margin-top:1.5rem">
          <button class="btn" id="checkBtn">Verificar streams</button>
          <span class="muted">Última actualización: ${s.lastUpdate ? new Date(s.lastUpdate).toLocaleString() : 'nunca'}</span>
        </div>`;
      $('#checkBtn').onclick = async () => {
        toast('Verificando streams...');
        const r = await API.checkStreams().catch((e) => toast(e.message, 'err'));
        if (r) toast(`Revisados ${r.checked}, caídos ${r.down}`, 'ok');
        setView('dashboard');
      };
    }).catch((e) => toast(e.message, 'err'));
  },

  movies(view) {
    API.listMovies().then((list) => {
      if (!list.length) { view.innerHTML = '<p class="muted">Sin películas. Usa "Buscar en TMDb".</p>'; return; }
      view.innerHTML = `<div class="grid">${list.map((m) => `
        <div class="card">
          <img src="${img(m.poster_path)}" alt="">
          <div class="body">
            <h4>${esc(m.title)} ${m.year ? '(' + m.year + ')' : ''}</h4>
            <p>${m.category ? esc(m.category.name) : ''} ${statusBadge(m.movie_servers?.[0]?.status)}</p>
            <div class="row" style="margin-top:.5rem">
              <button class="btn ghost" data-del="${m.id}">Eliminar</button>
            </div>
          </div>
        </div>`).join('')}</div>`;
      $$('[data-del]', view).forEach((b) => b.onclick = async () => {
        if (!confirm('Eliminar película?')) return;
        await API.delMovie(b.dataset.del).catch((e) => toast(e.message, 'err'));
        setView('movies');
      });
    }).catch((e) => toast(e.message, 'err'));
  },

  series(view) {
    API.listSeries().then((list) => {
      if (!list.length) { view.innerHTML = '<p class="muted">Sin series. Usa "Buscar en TMDb".</p>'; return; }
      view.innerHTML = `<div class="grid">${list.map((s) => `
        <div class="card">
          <img src="${img(s.poster_path)}" alt="">
          <div class="body">
            <h4>${esc(s.title)} ${s.year ? '(' + s.year + ')' : ''}</h4>
            <div class="row" style="margin-top:.5rem">
              <button class="btn ghost" data-open="${s.id}">Ver</button>
              <button class="btn ghost" data-del="${s.id}">✕</button>
            </div>
          </div>
        </div>`).join('')}</div>`;
      $$('[data-open]', view).forEach((b) => b.onclick = () => openSeries(b.dataset.open));
      $$('[data-del]', view).forEach((b) => b.onclick = async () => {
        if (!confirm('Eliminar serie?')) return;
        await API.delSeries(b.dataset.del).catch((e) => toast(e.message, 'err'));
        setView('series');
      });
    }).catch((e) => toast(e.message, 'err'));
  },

  channels(view) {
    API.listChannels().then((list) => {
      view.innerHTML = `<div class="row" style="margin-bottom:1rem"><button class="btn" id="addCh">+ Canal</button></div>
        <table class="table"><thead><tr><th>Nombre</th><th>Grupo</th><th>País</th><th>Estado</th><th></th></tr></thead><tbody>
        ${list.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.group_title || '')}</td><td>${esc(c.country || '')}</td><td>${statusBadge(c.status)}</td><td><button class="btn ghost" data-del="${c.id}">✕</button></td></tr>`).join('')}
        </tbody></table>`;
      $('#addCh').onclick = () => channelModal();
      $$('[data-del]', view).forEach((b) => b.onclick = async () => {
        await API.delChannel(b.dataset.del).catch((e) => toast(e.message, 'err'));
        setView('channels');
      });
    }).catch((e) => toast(e.message, 'err'));
  },

  tmdb(view) {
    view.innerHTML = `
      <div class="row">
        <input id="q" placeholder="Ej: Deadpool" style="flex:1;min-width:200px" />
        <select id="type"><option value="multi">Todo</option><option value="movie">Películas</option><option value="tv">Series</option></select>
        <button class="btn" id="go">Buscar</button>
      </div>
      <div id="results" style="margin-top:1.5rem"></div>`;
    const run = () => {
      const q = $('#q').value.trim();
      if (!q) return;
      API.tmdbSearch(q, $('#type').value).then((d) => {
        const items = (d.results || []).filter((r) => ['movie', 'tv'].includes(r.media_type) || r.title || r.name);
        $('#results').innerHTML = items.map((r) => {
          const title = r.title || r.name;
          const year = (r.release_date || r.first_air_date || '').slice(0, 4);
          const poster = img(r.poster_path, 'w200');
          const type = r.media_type === 'tv' ? 'Serie' : 'Película';
          return `<div class="search-result">
            <img src="${poster}" alt="">
            <div style="flex:1"><strong>${esc(title)}</strong> <span class="badge">${year}</span> <span class="badge">${type}</span></div>
            <button class="btn" data-sel="${r.id}" data-type="${r.media_type}">Seleccionar</button>
          </div>`;
        }).join('') || '<p class="muted">Sin resultados.</p>';
        $$('[data-sel]', $('#results')).forEach((b) => b.onclick = () => b.dataset.type === 'tv' ? tmdbToSeries(b.dataset.sel) : tmdbToMovie(b.dataset.sel));
      }).catch((e) => toast(e.message, 'err'));
    };
    $('#go').onclick = run;
    $('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  },

  m3u(view) {
    view.innerHTML = `
      <p class="muted">Genera y descarga las listas. Las URLs se construyen solo con los streams guardados en Supabase.</p>
      <div class="row" style="margin-top:1rem">
        <button class="btn" data-gen="all">todo.m3u</button>
        <button class="btn ghost" data-gen="movies">movies.m3u</button>
        <button class="btn ghost" data-gen="series">series.m3u</button>
        <button class="btn ghost" data-gen="tv">tv.m3u</button>
      </div>
      <p class="muted" style="margin-top:1rem">También puedes apuntar tu reproductor directamente a:</p>
      <code style="display:block;margin-top:.5rem;color:var(--ok)">${location.origin}/api/m3u/all</code>`;
    $$('[data-gen]', view).forEach((b) => b.onclick = () => { window.open(m3uUrl(b.dataset.gen), '_blank'); });
  },
};

// ---------- TMDb -> Película ----------
async function tmdbToMovie(id) {
  const m = await API.tmdbMovie(id).catch((e) => toast(e.message, 'err'));
  if (!m) return;
  const genres = (m.genres || []).map((g) => g.name);
  const dlg = modal(`
    <span class="close">✕</span>
    <h3>${esc(m.title)}</h3>
    <div class="row" style="align-items:flex-start">
      <img src="${img(m.poster_path)}" style="width:120px;border-radius:8px">
      <div style="flex:1">
        <p class="muted">${esc(m.overview || '')}</p>
        <p class="muted">Año: ${esc((m.release_date || '').slice(0, 4))} · Duración: ${m.runtime || '?'} min · Rating: ${m.vote_average || '?'}</p>
        <p class="muted">Géneros: ${genres.join(', ')}</p>
        <label>Enlace del stream (.m3u8/.mp4)</label>
        <input id="stream" style="width:100%" placeholder="https://...">
      </div>
    </div>
    <div class="row" style="margin-top:1rem;justify-content:flex-end">
      <button class="btn ghost" id="cancel">Cancelar</button>
      <button class="btn" id="save">Guardar película</button>
    </div>`);
  $('.close', dlg).onclick = () => dlg.remove();
  $('#cancel', dlg).onclick = () => dlg.remove();
  $('#save', dlg).onclick = async () => {
    const stream = $('#stream', m).value.trim();
    if (!stream) return toast('Agrega el enlace del stream', 'err');
    await API.createMovie({
      tmdb_id: m.id, title: m.title, original_title: m.original_title, synopsis: m.overview,
      year: +(m.release_date || '').slice(0, 4) || null, duration: m.runtime,
      country: (m.production_countries || [])[0]?.iso_3166_1 || '',
      certification: (m.release_dates?.results || [])[0]?.release_dates?.[0]?.certification || '',
      rating: m.vote_average, poster_path: m.poster_path, backdrop_path: m.backdrop_path,
      genres, stream,
    }).then(() => { toast('Película guardada', 'ok'); dlg.remove(); setView('movies'); })
      .catch((e) => toast(e.message, 'err'));
  };
}

// ---------- TMDb -> Serie -> temporadas/episodios ----------
async function tmdbToSeries(id) {
  const s = await API.tmdbTv(id).catch((e) => toast(e.message, 'err'));
  if (!s) return;
  const created = await API.createSeries({
    tmdb_id: s.id, title: s.name, original_title: s.original_name, synopsis: s.overview,
    year: +(s.first_air_date || '').slice(0, 4) || null,
    country: (s.origin_country || [])[0] || '', rating: s.vote_average,
    poster_path: s.poster_path, backdrop_path: s.backdrop_path,
    genres: (s.genres || []).map((g) => g.name),
  }).catch((e) => toast(e.message, 'err'));
  if (!created) return;
  toast('Serie creada. Cargando temporadas...', 'ok');
  openSeries(created.id, s);
}

async function openSeries(id, preloaded) {
  const s = preloaded || await API.getSeries(id).catch((e) => toast(e.message, 'err'));
  if (!s) return;
  const seasons = s.seasons || [];
  const m = modal(`
    <span class="close">✕</span>
    <h3>${esc(s.title)} — Temporadas</h3>
    <div class="row" style="margin-bottom:1rem">
      <button class="btn" id="importSeason">Importar temporada desde TMDb</button>
    </div>
    <div id="seasonList">${seasons.map((ss) => `<div class="search-result"><strong>T${ss.season_number} — ${esc(ss.title || 'Temporada ' + ss.season_number)}</strong><button class="btn ghost" data-ep="${ss.id}">Episodios</button></div>`).join('') || '<p class="muted">Sin temporadas.</p>'}</div>`);
  $('.close', m).onclick = () => m.remove();
  $('#importSeason', m).onclick = async () => {
    const n = prompt('Número de temporada a importar:');
    if (!n) return;
    const season = await API.tmdbSeason(s.tmdb_id, n).catch((e) => toast(e.message, 'err'));
    if (!season) return;
    await API.addSeason(s.id, { season_number: season.season_number, title: season.name, poster_path: season.poster_path, tmdb_id: season.id }).catch((e) => toast(e.message, 'err'));
    openSeries(s.id);
  };
  $$('[data-ep]', m).forEach((b) => b.onclick = () => episodeModal(s, b.dataset.ep));
}

async function episodeModal(series, seasonId) {
  const season = await API.tmdbSeason(series.tmdb_id, (await API.getSeries(series.id)).seasons.find((x) => x.id === seasonId)?.season_number).catch(() => null);
  const eps = season?.episodes || [];
  const m = modal(`
    <span class="close">✕</span>
    <h3>Episodios — Temporada ${season?.season_number || ''}</h3>
    <div id="eps">${eps.map((e) => `
      <div class="search-result">
        <div style="flex:1"><strong>E${e.episode_number} — ${esc(e.name)}</strong></div>
        <input id="url-${e.episode_number}" placeholder="Stream URL" style="flex:1">
        <button class="btn" data-add="${e.episode_number}">+ Link</button>
      </div>`).join('') || '<p class="muted">Sin episodios.</p>'}</div>`);
  $('.close', m).onclick = () => m.remove();
  $$('[data-add]', m).forEach((b) => b.onclick = async () => {
    const ep = eps.find((x) => x.episode_number == b.dataset.add);
    const url = $(`#url-${b.dataset.add}`, m).value.trim();
    if (!url) return toast('Pon el enlace', 'err');
    await API.addEpisode(seasonId, {
      episode_number: ep.episode_number, title: ep.name, tmdb_id: ep.id,
      still_path: ep.still_path, synopsis: ep.overview, duration: ep.runtime, air_date: ep.air_date, stream: url,
    }).then(() => toast('Episodio guardado', 'ok')).catch((e) => toast(e.message, 'err'));
  });
}

// ---------- Canal ----------
function channelModal() {
  const m = modal(`
    <span class="close">✕</span><h3>Nuevo canal</h3>
    <label>Nombre</label><input id="c_name" style="width:100%">
    <label>Logo URL</label><input id="c_logo" style="width:100%">
    <label>Grupo</label><input id="c_group" style="width:100%" placeholder="TV en Vivo">
    <label>País</label><input id="c_country" style="width:100%">
    <label>Idioma</label><input id="c_lang" style="width:100%">
    <label>Stream URL</label><input id="c_stream" style="width:100%">
    <label>tvg-id</label><input id="c_tvgid" style="width:100%">
    <label>tvg-name</label><input id="c_tvgname" style="width:100%">
    <div class="row" style="margin-top:1rem;justify-content:flex-end">
      <button class="btn ghost" id="c_cancel">Cancelar</button>
      <button class="btn" id="c_save">Guardar</button>
    </div>`);
  $('.close', m).onclick = () => m.remove();
  $('#c_cancel', m).onclick = () => m.remove();
  $('#c_save', m).onclick = async () => {
    await API.createChannel({
      name: $('#c_name', m).value, logo: $('#c_logo', m).value, group_title: $('#c_group', m).value,
      country: $('#c_country', m).value, language: $('#c_lang', m).value, stream: $('#c_stream', m).value,
      tvg_id: $('#c_tvgid', m).value, tvg_name: $('#c_tvgname', m).value,
    }).then(() => { toast('Canal guardado', 'ok'); m.remove(); setView('channels'); })
      .catch((e) => toast(e.message, 'err'));
  };
}

// ---------- Init ----------
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await API.login($('#username').value, $('#password').value);
    API.setToken(r.token);
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    setView('dashboard');
  } catch (err) {
    $('#loginError').textContent = err.message;
  }
});

$('#logout').onclick = () => { API.logout(); location.reload(); };
$$('.sidebar nav a').forEach((a) => a.onclick = () => setView(a.dataset.view));

if (API.token) {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  setView('dashboard');
}
