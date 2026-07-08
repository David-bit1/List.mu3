const supabase = require('./supabase');

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function upsertGenres(names = []) {
  const ids = [];
  for (const name of names) {
    if (!name) continue;
    const slug = slugify(name);
    const { data } = await supabase
      .from('genres')
      .upsert({ name, slug }, { onConflict: 'slug' })
      .select('id')
      .single();
    if (data) ids.push(data.id);
  }
  return ids;
}

async function getOrCreateServer(name = 'Servidor 1') {
  const slug = slugify(name);
  const { data } = await supabase
    .from('servers')
    .upsert({ name, slug }, { onConflict: 'slug' })
    .select('id')
    .single();
  return data?.id;
}

function setGenres(junctionTable, parentId, genreIds) {
  return supabase.from(junctionTable).upsert(
    genreIds.map((gid) => ({ [junctionTable.split('_')[0] + '_id']: parentId, genre_id: gid })),
    { onConflict: junctionTable.split('_')[0] + '_id,genre_id' }
  );
}

module.exports = { slugify, upsertGenres, getOrCreateServer, setGenres };
