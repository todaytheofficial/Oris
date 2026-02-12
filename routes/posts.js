const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { text, media } = req.body;
    if (!text && (!media || media.length === 0)) return res.status(400).json({ error: 'Пост пуст' });
    const post = new Post({ author: req.userId, text: text || '', media: media || [] });
    await post.save();
    await post.populate('author', 'username name avatar verifiedBadge');
    res.json({ success: true, post });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const user = req.user;
    const feedUserIds = [...user.following, user._id];
    const posts = await Post.find({ author: { $in: feedUserIds } })
      .sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('author', 'username name avatar verifiedBadge')
      .populate('comments.author', 'username name avatar verifiedBadge');
    const total = await Post.countDocuments({ author: { $in: feedUserIds } });
    res.json({ posts, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/explore', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const posts = await Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('author', 'username name avatar verifiedBadge')
      .populate('comments.author', 'username name avatar verifiedBadge');
    const total = await Post.countDocuments();
    res.json({ posts, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const mediaOnly = req.query.media === 'true';
    let query = { author: req.params.userId };
    if (mediaOnly) query['media.0'] = { $exists: true };
    const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('author', 'username name avatar verifiedBadge')
      .populate('comments.author', 'username name avatar verifiedBadge');
    const total = await Post.countDocuments(query);
    res.json({ posts, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Не найден' });
    const idx = post.likes.indexOf(req.userId);
    if (idx === -1) post.likes.push(req.userId); else post.likes.splice(idx, 1);
    await post.save();
    res.json({ success: true, likes: post.likes.length, liked: idx === -1 });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Комментарий пуст' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Не найден' });
    post.comments.push({ author: req.userId, text });
    await post.save();
    await post.populate('comments.author', 'username name avatar verifiedBadge');
    const newComment = post.comments[post.comments.length - 1];
    res.json({ success: true, comment: newComment });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Не найден' });
    if (post.author.toString() !== req.userId.toString()) return res.status(403).json({ error: 'Нет прав' });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;