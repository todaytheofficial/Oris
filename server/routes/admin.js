// server/routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// Список всех пользователей
router.get('/users', async (req, res) => {
  try {
    const q = req.query.q || '';
    const query = q ? {
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(query)
      .select('username displayName email avatar hasBadge isBanned followersCount createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Выдать/снять галочку
router.post('/badge/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Не найден' });

    user.hasBadge = !user.hasBadge;
    await user.save();

    res.json({ success: true, hasBadge: user.hasBadge, username: user.username });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Бан/разбан
router.post('/ban/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Не найден' });
    if (user.username === 'Today_Idk') return res.status(400).json({ success: false, message: 'Нельзя забанить админа' });

    user.isBanned = !user.isBanned;
    user.banReason = req.body.reason || '';
    await user.save();

    res.json({ success: true, isBanned: user.isBanned, username: user.username });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Удалить аккаунт
router.delete('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Не найден' });
    if (user.username === 'Today_Idk') return res.status(400).json({ success: false, message: 'Нельзя удалить админа' });

    await Post.deleteMany({ author: user._id });
    await Comment.deleteMany({ author: user._id });
    await User.deleteOne({ _id: user._id });

    res.json({ success: true, message: `${user.username} удалён` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Накрутить подписчиков
router.post('/followers/:userId', async (req, res) => {
  try {
    const count = parseInt(req.body.count) || 0;
    if (count < 1 || count > 100000) return res.status(400).json({ success: false, message: 'От 1 до 100000' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Не найден' });

    user.followersCount += count;

    // Автогалочка на 50+
    if (user.followersCount >= 50 && !user.hasBadge) {
      user.hasBadge = true;
    }

    await user.save();

    res.json({ success: true, followersCount: user.followersCount, hasBadge: user.hasBadge });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;