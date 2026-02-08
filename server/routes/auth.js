// server/routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/verify/:token', verifyEmail);
router.get('/me', protect, getMe);

module.exports = router;