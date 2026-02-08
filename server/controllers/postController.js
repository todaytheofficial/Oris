// server/controllers/postController.js
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadFile, deleteFile } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Создание поста
exports.createPost = async (req, res, next) => {
  try {
    const { text, type, gifUrl } = req.body;
    const postData = {
      author: req.user._id,
      type: type || 'text',
      text: text || ''
    };

    if (gifUrl) {
      postData.gifUrl = gifUrl;
      postData.type = 'image';
    }

    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.bin';
      const folder = postData.type === 'voice' ? 'voice' : 'images';
      const fileName = `posts/${folder}/${req.user._id}/${uuidv4()}${ext}`;

      const publicUrl = await uploadFile(req.file.buffer, fileName, req.file.mimetype);
      postData.mediaUrl = publicUrl;
      postData.mediaPath = fileName;
    }

    if (!postData.text && !postData.mediaUrl && !postData.gifUrl) {
      return res.status(400).json({ success: false, message: 'Пост не может быть пустым' });
    }

    const post = await Post.create(postData);
    await post.populate('author', 'username displayName avatar');

    res.status(201).json({ success: true, post });
  } catch (error) { next(error); }
};

// Лента
exports.getFeed = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;
    const query = {};
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'username displayName avatar')
      .lean();

    const userId = req.user?._id;
    const user = userId ? await User.findById(userId).select('bookmarks').lean() : null;
    const bookmarks = user?.bookmarks?.map(b => b.toString()) || [];

    const postsData = posts.map(post => ({
      ...post,
      isLiked: userId ? post.likes.some(id => id.toString() === userId.toString()) : false,
      isBookmarked: bookmarks.includes(post._id.toString()),
      likes: undefined
    }));

    res.json({
      success: true,
      posts: postsData,
      nextCursor: posts.length === limit ? posts[posts.length - 1]._id : null
    });
  } catch (error) { next(error); }
};

// Посты пользователя
exports.getUserPosts = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;
    const typeFilter = req.query.type;

    const query = { author: req.params.userId };
    if (cursor) query._id = { $lt: cursor };
    if (typeFilter === 'media') {
      query.$or = [
        { mediaUrl: { $ne: '' } },
        { gifUrl: { $ne: '' } }
      ];
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'username displayName avatar')
      .lean();

    const userId = req.user?._id;
    const postsData = posts.map(post => ({
      ...post,
      isLiked: userId ? post.likes.some(id => id.toString() === userId.toString()) : false,
      likes: undefined
    }));

    res.json({
      success: true,
      posts: postsData,
      nextCursor: posts.length === limit ? posts[posts.length - 1]._id : null
    });
  } catch (error) { next(error); }
};

exports.getUserLikedPosts = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const posts = await require('../models/Post').find({ likes: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'username displayName avatar hasBadge')
      .lean();

    const postsData = posts.map(post => ({
      ...post,
      isLiked: true,
      likes: undefined
    }));

    res.json({ success: true, posts: postsData });
  } catch (error) { next(error); }
};

// Лайк
exports.toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Пост не найден' });

    const userId = req.user._id;
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes.pull(userId);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      post.likes.push(userId);
      post.likesCount += 1;

      // Уведомление
      if (post.author.toString() !== userId.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like',
          post: post._id,
          message: `${req.user.displayName || req.user.username} оценил(а) ваш пост`
        });
      }
    }

    await post.save();
    res.json({ success: true, isLiked: !alreadyLiked, likesCount: post.likesCount });
  } catch (error) { next(error); }
};

exports.toggleBookmark = async (req, res, next) => {
  try {
    const user = await require('../models/User').findById(req.user._id);
    const postId = req.params.id;
    const isBookmarked = user.bookmarks.includes(postId);

    if (isBookmarked) {
      user.bookmarks.pull(postId);
    } else {
      user.bookmarks.push(postId);
    }

    await user.save();
    res.json({ success: true, isBookmarked: !isBookmarked });
  } catch (error) { next(error); }
};

// Комментарии — получить
exports.getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('author', 'username displayName avatar')
      .lean();

    res.json({ success: true, comments });
  } catch (error) { next(error); }
};

// server/controllers/postController.js — замени createPost

exports.createPost = async (req, res, next) => {
  try {
    const { text, type, gifUrl } = req.body;
    const postData = {
      author: req.user._id,
      type: type || 'text',
      text: text || ''
    };

    // GIF пост
    if (gifUrl) {
      postData.gifUrl = gifUrl;
      postData.type = 'image';
    }

    // Файл (картинка/голос)
    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.bin';
      const folder = postData.type === 'voice' ? 'voice' : 'images';
      const fileName = `posts/${folder}/${req.user._id}/${uuidv4()}${ext}`;
      const publicUrl = await uploadFile(req.file.buffer, fileName, req.file.mimetype);
      postData.mediaUrl = publicUrl;
      postData.mediaPath = fileName;
    }

    if (!postData.text && !postData.mediaUrl && !postData.gifUrl) {
      return res.status(400).json({ success: false, message: 'Пост не может быть пустым' });
    }

    const post = await Post.create(postData);
    await post.populate('author', 'username displayName avatar hasBadge');

    res.status(201).json({ success: true, post });
  } catch (error) { next(error); }
};

// Комментарии — удалить
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Комментарий не найден' });

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Нет прав' });
    }

    await Post.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: -1 } });
    await Comment.deleteOne({ _id: comment._id });

    res.json({ success: true });
  } catch (error) { next(error); }
};

// Удаление поста
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Пост не найден' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Нет прав' });
    }

    if (post.mediaPath) await deleteFile(post.mediaPath);
    await Comment.deleteMany({ post: post._id });
    await Post.deleteOne({ _id: post._id });

    res.json({ success: true });
  } catch (error) { next(error); }
};