require('dotenv').config();

const cookieParser = require('cookie-parser');
const express = require('express');
const { COOKIE_SECRET } = require('./config/cookie.config');
const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(express.json({ limit: '16kb' }));
app.use(cookieParser(COOKIE_SECRET));
app.use('/auth', authRoutes);

app.get('/profile', requireAuth, (req, res) => {
  return res.status(200).json({
    userId: req.user.sub,
    message: 'Profile data',
  });
});

app.get('/posts/my', requireAuth, (req, res) => {
  return res.status(200).json({
    userId: req.user.sub,
    posts: [],
  });
});

app.post('/posts', requireAuth, (req, res) => {
  return res.status(201).json({
    userId: req.user.sub,
    message: 'Post created',
  });
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
    return res.status(error.type === 'entity.too.large' ? 413 : 400).json({
      error: 'Invalid request',
    });
  }

  console.error('Request failed:', error);
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
