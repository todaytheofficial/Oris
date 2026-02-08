// server/controllers/authController.js
const User = require('../models/User');
const Token = require('../models/Token');
const { generateToken } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/email');
const { v4: uuidv4 } = require('uuid');

// ===== Регистрация =====
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Проверка уникальности
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Имя пользователя';
      return res.status(400).json({
        success: false,
        message: `${field} уже занят`
      });
    }

    // Создаём пользователя
    const user = await User.create({
      username,
      email,
      password,
      displayName: username
    });

    // Создаём токен верификации
    const verificationToken = uuidv4();
    await Token.create({
      userId: user._id,
      token: verificationToken,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 часа
    });

    // Отправляем письмо (не блокируем ответ)
    sendVerificationEmail(email, verificationToken).catch(err => {
      console.error('Email send error:', err);
    });

    // Генерируем JWT
    const jwt = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Регистрация успешна! Проверьте почту для подтверждения.',
      token: jwt,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===== Логин =====
exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body;   // login = email или username

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: 'Введите логин и пароль'
      });
    }

    // Ищем по email или username, явно запрашиваем пароль
    const user = await User.findOne({
      $or: [
        { email: login.toLowerCase() },
        { username: login }
      ]
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Неверный логин или пароль'
      });
    }

    const jwt = generateToken(user._id);

    res.json({
      success: true,
      token: jwt,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        bio: user.bio
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===== Подтверждение email =====
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const tokenDoc = await Token.findOne({
      token,
      type: 'email_verification'
    });

    if (!tokenDoc) {
      return res.status(400).send(`
        <html><body style="background:#0f0f23;color:white;display:flex;
        align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <div style="text-align:center">
          <h1 style="color:#ef4444">Ссылка недействительна</h1>
          <p>Токен истёк или уже использован.</p>
          <a href="/" style="color:#7c3aed">На главную</a>
        </div></body></html>
      `);
    }

    await User.findByIdAndUpdate(tokenDoc.userId, { isVerified: true });
    await Token.deleteOne({ _id: tokenDoc._id });

    res.send(`
      <html><body style="background:#0f0f23;color:white;display:flex;
      align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
      <div style="text-align:center">
        <h1 style="color:#7c3aed">✅ Email подтверждён!</h1>
        <p>Теперь вы можете пользоваться всеми функциями Oris.</p>
        <a href="/" style="color:#7c3aed;font-size:18px">Перейти в Oris →</a>
      </div></body></html>
    `);
  } catch (error) {
    next(error);
  }
};

// ===== Получить текущего пользователя =====
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    }
  });
};