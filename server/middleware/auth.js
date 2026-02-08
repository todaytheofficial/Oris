// server/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Необходима авторизация' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Пользователь не найден' });

    // Проверка бана
    if (user.isBanned) {
      return res.status(403).json({ success: false, message: `Аккаунт заблокирован: ${user.banReason || 'нарушение правил'}` });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Невалидный токен' });
  }
};

// Middleware проверки админа
const adminOnly = (req, res, next) => {
  if (req.user.username !== 'Today_Idk' && !req.user.isAdmin) {
    return res.status(403).json({ success: false, message: 'Нет доступа' });
  }
  next();
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

module.exports = { protect, adminOnly, generateToken };