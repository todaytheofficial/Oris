// server/middleware/captcha.js
const https = require('https');

/**
 * Проверка Google reCAPTCHA v2
 * Ожидает поле captchaToken в теле запроса
 */
const verifyCaptcha = async (req, res, next) => {
  // В dev-режиме можно пропускать
  if (process.env.NODE_ENV === 'development' && !process.env.RECAPTCHA_SECRET) {
    return next();
  }

  const { captchaToken } = req.body;

  if (!captchaToken) {
    return res.status(400).json({
      success: false,
      message: 'Пройдите проверку CAPTCHA'
    });
  }

  try {
    const result = await verifyRecaptcha(captchaToken);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Не удалось пройти CAPTCHA'
      });
    }
    next();
  } catch (error) {
    console.error('CAPTCHA error:', error);
    // При ошибке сервиса — пропускаем (graceful degradation)
    next();
  }
};

function verifyRecaptcha(token) {
  return new Promise((resolve, reject) => {
    const postData = `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`;

    const options = {
      hostname: 'www.google.com',
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = { verifyCaptcha };