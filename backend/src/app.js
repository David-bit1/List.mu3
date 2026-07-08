const path = require('path');
const express = require('express');

const authRoutes = require('./routes/auth');
const tmdbRoutes = require('./routes/tmdb');
const moviesRoutes = require('./routes/movies');
const seriesRoutes = require('./routes/series');
const channelsRoutes = require('./routes/channels');
const dashboardRoutes = require('./routes/dashboard');
const m3uRoutes = require('./routes/m3u');
const streamsRoutes = require('./routes/streams');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/streams', streamsRoutes);
app.use('/api/m3u', m3uRoutes);

app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

module.exports = app;
