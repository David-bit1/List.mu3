require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  tmdbApiKey: process.env.TMDB_API_KEY,
  tmdbBase: 'https://api.themoviedb.org/3',
  tmdbImg: 'https://image.tmdb.org/t/p',
  jwtSecret: process.env.JWT_SECRET || 'cambia-este-secreto',
  adminUser: process.env.ADMIN_USERNAME || 'admin',
  adminPass: process.env.ADMIN_PASSWORD || 'admin',
};

module.exports = config;
