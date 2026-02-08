// server/server.js
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === СТАТИКА С ПРАВИЛЬНЫМИ MIME ТИПАМИ ===
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Роуты API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/gif', require('./routes/gif'));
app.use('/api/admin', require('./routes/admin'));

// === SPA — НЕ ПЕРЕХВАТЫВАТЬ ЗАПРОСЫ К ФАЙЛАМ ===
app.get('*', (req, res) => {
  // Если запрос к файлу (есть расширение) — значит файл не найден
  if (req.path.match(/\.\w+$/)) {
    return res.status(404).send('File not found');
  }
  // Иначе — SPA маршрут, отдаём index.html
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