// server/utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,                // true для 465, false для 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Отправляет письмо для подтверждения email
 */
async function sendVerificationEmail(to, token) {
  const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify/${token}`;

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto;
                background: #1a1a2e; color: #e0e0e0; padding: 40px; border-radius: 16px;">
      <h1 style="color: #7c3aed; text-align: center; font-size: 32px;">Oris</h1>
      <p style="font-size: 16px; line-height: 1.6;">Добро пожаловать! Подтвердите ваш email:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}"
           style="background: linear-gradient(135deg, #7c3aed, #a78bfa);
                  color: white; padding: 14px 40px; border-radius: 12px;
                  text-decoration: none; font-weight: bold; font-size: 16px;
                  display: inline-block;">
          Подтвердить Email
        </a>
      </div>
      <p style="font-size: 13px; color: #888;">
        Ссылка действительна 24 часа. Если вы не регистрировались — проигнорируйте.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Oris" <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Подтверждение email — Oris',
    html
  });
}

module.exports = { sendVerificationEmail };