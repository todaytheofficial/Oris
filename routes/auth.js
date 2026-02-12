const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  pool: true,
  maxConnections: 3
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// ============ STEP 1: Username + Name ============
router.post('/step1', async (req, res) => {
  try {
    const { username, name } = req.body;

    if (!username || !name) {
      return res.status(400).json({ error: 'Username и имя обязательны' });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username минимум 3 символа (a-z, 0-9, _)' });
    }

    // Удаляем ВСЕ незавершённые регистрации с этим username
    await User.deleteMany({
      username: cleanUsername,
      registrationStep: { $lt: 4 }
    });

    // Проверяем, есть ли завершённый юзер с таким username
    const existing = await User.findOne({ username: cleanUsername, registrationStep: 4 });
    if (existing) {
      return res.status(400).json({ error: 'Username уже занят' });
    }

    // Создаём нового юзера БЕЗ email (убираем фейковый)
    const user = new User({
      username: cleanUsername,
      name: name.trim(),
      registrationStep: 1
    });

    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: { _id: user._id, username: user.username, name: user.name, registrationStep: 1 }
    });
  } catch (err) {
    console.error('Step1 error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/step2', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email обязателен' });

    const emailLower = email.toLowerCase().trim();

    const emailTaken = await User.findOne({
      email: emailLower,
      registrationStep: 4,
      _id: { $ne: req.userId }
    });
    if (emailTaken) return res.status(400).json({ error: 'Email уже используется' });

    await User.deleteMany({
      email: emailLower,
      registrationStep: { $lt: 4 },
      _id: { $ne: req.userId }
    });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(req.userId, {
      email: emailLower,
      verificationCode: code,
      verificationCodeExpires: expires,
      registrationStep: 2
    });

    // Отправляем сразу ответ клиенту, письмо отправляем в фоне
    res.json({ success: true, message: 'Код отправлен на ' + emailLower });

    // Фоновая отправка
    transporter.sendMail({
      from: '"Oris" <' + process.env.SMTP_USER + '>',
      to: emailLower,
      subject: 'Код подтверждения Oris',
      html: '<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee;">'
        + '<h2 style="color:#000;margin-bottom:8px;">Oris</h2>'
        + '<p style="color:#666;margin-bottom:24px;">Ваш код подтверждения:</p>'
        + '<div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;color:#000;padding:20px;background:#f5f5f5;border-radius:12px;">' + code + '</div>'
        + '<p style="color:#999;font-size:13px;margin-top:24px;">Код действителен 10 минут.</p>'
        + '</div>'
    }).catch(err => console.error('Mail send error:', err.message));

  } catch (err) {
    console.error('Step2 error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============ STEP 3a: Verify Code ============
router.post('/verify-code', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (!user.verificationCode) {
      return res.status(400).json({ error: 'Код не запрашивался' });
    }

    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ error: 'Код истёк. Запросите новый.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    await User.findByIdAndUpdate(req.userId, {
      verified: true,
      verificationCode: null,
      verificationCodeExpires: null,
      registrationStep: 3
    });

    res.json({ success: true, message: 'Email подтверждён' });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/resend-code', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.email) return res.status(400).json({ error: 'Сначала укажите email' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(req.userId, {
      verificationCode: code,
      verificationCodeExpires: expires
    });

    res.json({ success: true, message: 'Новый код отправлен' });

    transporter.sendMail({
      from: '"Oris" <' + process.env.SMTP_USER + '>',
      to: user.email,
      subject: 'Новый код подтверждения Oris',
      html: '<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee;">'
        + '<h2 style="color:#000;">Oris</h2>'
        + '<p style="color:#666;">Новый код:</p>'
        + '<div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;color:#000;padding:20px;background:#f5f5f5;border-radius:12px;">' + code + '</div>'
        + '<p style="color:#999;font-size:13px;margin-top:24px;">Действителен 10 минут.</p>'
        + '</div>'
    }).catch(err => console.error('Resend mail error:', err.message));

  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============ STEP 4: Avatar + Complete ============
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;

    const updateData = { registrationStep: 4 };
    if (avatar) {
      updateData.avatar = avatar;
    }

    const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true })
      .select('-verificationCode -verificationCodeExpires');

    res.json({ success: true, user });
  } catch (err) {
    console.error('Complete error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============ LOGIN: Send Code ============
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const emailLower = email.toLowerCase().trim();

    const user = await User.findOne({ email: emailLower, registrationStep: 4 });
    if (!user) {
      return res.status(404).json({ error: 'Аккаунт не найден' });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      verificationCode: code,
      verificationCodeExpires: expires
    });

    await transporter.sendMail({
      from: `"Oris" <${process.env.SMTP_USER}>`,
      to: emailLower,
      subject: 'Вход в Oris',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee;">
          <h2 style="color:#000;">Oris</h2>
          <p style="color:#666;">Код для входа:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;color:#000;padding:20px;background:#f5f5f5;border-radius:12px;">${code}</div>
          <p style="color:#999;font-size:13px;margin-top:24px;">Действителен 10 минут.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Код отправлен' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============ LOGIN: Verify Code ============
router.post('/login-verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (!user.verificationCode || new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ error: 'Код истёк' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    await User.findByIdAndUpdate(user._id, {
      verificationCode: null,
      verificationCodeExpires: null
    });

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
    console.error('Login verify error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============ GET /me ============
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