const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// ===== Проверка hCaptcha =====
async function verifyCaptcha(token) {
  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.hcpatchakodecer,
        response: token
      })
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Captcha verify error:', err.message);
    return false;
  }
}

// REGISTER — один шаг: username + name + email + captcha
router.post('/register', async (req, res) => {
  try {
    const { username, name, email, captchaToken } = req.body;

    if (!username || !name || !email) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }
    if (!captchaToken) {
      return res.status(400).json({ error: 'Пройдите капчу' });
    }

    // Проверяем капчу
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return res.status(400).json({ error: 'Капча не пройдена. Попробуйте снова.' });
    }

    const clean = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) return res.status(400).json({ error: 'Username минимум 3 символа' });

    const e = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    // Чистим незавершённые регистрации
    await User.deleteMany({ username: clean, registrationStep: { $lt: 4 } });
    await User.deleteMany({ email: e, registrationStep: { $lt: 4 } });

    const existingUsername = await User.findOne({ username: clean, registrationStep: 4 });
    if (existingUsername) return res.status(400).json({ error: 'Username занят' });

    const existingEmail = await User.findOne({ email: e, registrationStep: 4 });
    if (existingEmail) return res.status(400).json({ error: 'Email используется' });

    const user = new User({
      username: clean,
      name: name.trim(),
      email: e,
      verified: true,
      registrationStep: 3
    });
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        registrationStep: 3
      }
    });
  } catch (err) {
    console.error('Register:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// COMPLETE — добавить аватар (шаг 4)
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    const upd = { registrationStep: 4 };
    if (avatar) upd.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.userId, upd, { new: true })
      .select('-verificationCode -verificationCodeExpires');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// LOGIN — email + captcha
router.post('/login', async (req, res) => {
  try {
    const { email, captchaToken } = req.body;

    if (!email) return res.status(400).json({ error: 'Введите email' });
    if (!captchaToken) return res.status(400).json({ error: 'Пройдите капчу' });

    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return res.status(400).json({ error: 'Капча не пройдена' });
    }

    const e = email.toLowerCase().trim();
    const user = await User.findOne({ email: e, registrationStep: 4 });
    if (!user) return res.status(404).json({ error: 'Аккаунт не найден' });

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        registrationStep: user.registrationStep,
        verifiedBadge: user.verifiedBadge,
        role: user.role,
        theme: user.theme
      }
    });
  } catch (err) {
    console.error('Login:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ME
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-verificationCode -verificationCodeExpires')
      .populate('followers', 'username name avatar verifiedBadge')
      .populate('following', 'username name avatar verifiedBadge');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;