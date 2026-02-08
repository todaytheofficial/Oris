// server/server.js
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// server/server.js — найди helmet и замени на это:

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// server/server.js — добавь эту строку к остальным роутам

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/gif', require('./routes/gif'));    // ← ДОБАВЬ
app.use('/api/admin', require('./routes/admin'));

// SPA — все маршруты отдают index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Ошибка сервера' : err.message
  });
});

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Oris на порту ${PORT}`));
});