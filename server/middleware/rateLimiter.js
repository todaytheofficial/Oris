// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Общий лимит для API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 минут
  max: 100,                        // 100 запросов с одного IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Слишком много запросов. Попробуйте через 15 минут.'
  }
});

// Строгий лимит для авторизации (анти-брутфорс)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                         // 10 попыток логина за 15 мин
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Слишком много попыток входа. Подождите 15 минут.'
  }
});

// Лимит на создание постов
const postLimiter = rateLimit({
  windowMs: 60 * 1000,             // 1 минута
  max: 5,                          // 5 постов в минуту
  message: {
    success: false,
    message: 'Вы создаёте посты слишком часто.'
  }
});

module.exports = { apiLimiter, authLimiter, postLimiter };