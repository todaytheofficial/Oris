const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

// Get user profile by username
router.get('/profile/:username', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
      registrationStep: 4
    })
      .select('-verificationCode -verificationCodeExpires -email')
      .populate('followers', 'username name avatar verifiedBadge')
      .populate('following', 'username name avatar verifiedBadge');
      
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const postsCount = await Post.countDocuments({ author: user._id });

    const isFollowing = user.followers.some(
      f => f._id.toString() === req.userId.toString()
    );

    res.json({
      user,
      postsCount,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowing,
      isOwn: user._id.toString() === req.userId.toString()
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Follow / Unfollow
router.post('/follow/:userId', authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.userId;

    if (targetId === req.userId.toString()) {
      return res.status(400).json({ error: 'Нельзя подписаться на себя' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

    const me = await User.findById(req.userId);
    const isFollowing = me.following.includes(targetId);

    if (isFollowing) {
      me.following = me.following.filter(id => id.toString() !== targetId);
      target.followers = target.followers.filter(id => id.toString() !== req.userId.toString());
    } else {
      me.following.push(targetId);
      target.followers.push(req.userId);
    }

    await me.save();
    await target.save();

    res.json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: target.followers.length
    });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true })
      .select('-verificationCode -verificationCodeExpires');

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Save theme
router.put('/theme', authMiddleware, async (req, res) => {
  try {
    const { theme } = req.body;
    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({ error: 'Неверная тема' });
    }

    await User.findByIdAndUpdate(req.userId, { theme });
    res.json({ success: true, theme });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Search users
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json({ users: [] });
    const users = await User.find({
      registrationStep: 4,
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    }).select('username name avatar verifiedBadge').limit(20);
    res.json({ users });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;