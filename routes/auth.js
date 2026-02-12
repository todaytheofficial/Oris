const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// ===== SMTP транспорт вместо Resend =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: parseInt(process.env.SMTP_PORT, 10) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Важно для Render.com — увеличенные таймауты
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

// Проверяем SMTP при старте
transporter.verify()
  .then(() => console.log('✅ SMTP connection OK'))
  .catch(err => console.error('❌ SMTP connection FAILED:', err.message));

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function codeHTML(code) {
  return '<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #eee;">'
    + '<h2 style="color:#000;margin-bottom:8px;">Oris</h2>'
    + '<p style="color:#666;margin-bottom:24px;">Ваш код подтверждения:</p>'
    + '<div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;color:#000;padding:20px;background:#f5f5f5;border-radius:12px;">' + code + '</div>'
    + '<p style="color:#999;font-size:13px;margin-top:24px;">Код действителен 10 минут.</p>'
    + '</div>';
}

// ===== Надёжная отправка email с ретраями =====
async function sendEmail(to, subject, code) {
  const mailOptions = {
    from: `Oris <${process.env.SMTP_USER}>`,
    to: to,
    subject: subject,
    html: codeHTML(code)
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to} (attempt ${attempt}), messageId: ${info.messageId}`);
      return true;
    } catch (err) {
      console.error(`❌ Email attempt ${attempt}/3 to ${to} failed:`, err.message);
      if (attempt < 3) {
        // Ждём перед повтором
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }
  console.error(`❌ All 3 email attempts to ${to} failed`);
  return false;
}

// STEP 1
router.post('/step1', async (req, res) => {
  try {
    const { username, name } = req.body;
    if (!username || !name) return res.status(400).json({ error: 'Username и имя обязательны' });
    const clean = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) return res.status(400).json({ error: 'Username минимум 3 символа' });

    await User.deleteMany({ username: clean, registrationStep: { $lt: 4 } });
    const existing = await User.findOne({ username: clean, registrationStep: 4 });
    if (existing) return res.status(400).json({ error: 'Username занят' });

    const user = new User({ username: clean, name: name.trim(), registrationStep: 1 });
    await user.save();
    const token = generateToken(user._id);
    res.json({ success: true, token, user: { _id: user._id, username: user.username, name: user.name, registrationStep: 1 } });
  } catch (err) {
    console.error('Step1:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// STEP 2 — отправляем email ДО ответа клиенту
router.post('/step2', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email обязателен' });
    const e = email.toLowerCase().trim();

    const taken = await User.findOne({ email: e, registrationStep: 4, _id: { $ne: req.userId } });
    if (taken) return res.status(400).json({ error: 'Email используется' });

    await User.deleteMany({ email: e, registrationStep: { $lt: 4 }, _id: { $ne: req.userId } });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await User.findByIdAndUpdate(req.userId, {
      email: e,
      verificationCode: code,
      verificationCodeExpires: expires,
      registrationStep: 2
    });

    // Сначала отправляем email, потом отвечаем
    const sent = await sendEmail(e, 'Код подтверждения Oris', code);
    if (!sent) {
      return res.status(500).json({ error: 'Не удалось отправить письмо. Попробуйте позже.' });
    }

    res.json({ success: true, message: 'Код отправлен на ' + e });
  } catch (err) {
    console.error('Step2:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// VERIFY CODE
router.post('/verify-code', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Не найден' });
    if (!user.verificationCode) return res.status(400).json({ error: 'Код не запрашивался' });
    if (new Date() > user.verificationCodeExpires) return res.status(400).json({ error: 'Код истёк' });
    if (user.verificationCode !== code) return res.status(400).json({ error: 'Неверный код' });

    await User.findByIdAndUpdate(req.userId, {
      verified: true,
      verificationCode: null,
      verificationCodeExpires: null,
      registrationStep: 3
    });
    res.json({ success: true, message: 'Email подтверждён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// RESEND
router.post('/resend-code', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.email) return res.status(400).json({ error: 'Укажите email' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await User.findByIdAndUpdate(req.userId, {
      verificationCode: code,
      verificationCodeExpires: expires
    });

    const sent = await sendEmail(user.email, 'Новый код Oris', code);
    if (!sent) {
      return res.status(500).json({ error: 'Не удалось отправить письмо' });
    }

    res.json({ success: true, message: 'Код отправлен' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// COMPLETE
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

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const e = email.toLowerCase().trim();
    const user = await User.findOne({ email: e, registrationStep: 4 });
    if (!user) return res.status(404).json({ error: 'Аккаунт не найден' });

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await User.findByIdAndUpdate(user._id, {
      verificationCode: code,
      verificationCodeExpires: expires
    });

    const sent = await sendEmail(e, 'Вход в Oris', code);
    if (!sent) {
      return res.status(500).json({ error: 'Не удалось отправить письмо' });
    }

    res.json({ success: true, message: 'Код отправлен' });
  } catch (err) {
    console.error('Login:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// LOGIN VERIFY
router.post('/login-verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: 'Не найден' });
    if (!user.verificationCode || new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ error: 'Код истёк' });
    }
    if (user.verificationCode !== code) return res.status(400).json({ error: 'Неверный код' });

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