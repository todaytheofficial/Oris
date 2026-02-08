// server/controllers/userController.js
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { uploadFile, deleteFile } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

exports.updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio } = req.body;
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName.slice(0, 50);
    if (bio !== undefined) updates.bio = bio.slice(0, 300);

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    res.json({
      success: true,
      user: {
        id: user._id, username: user.username,
        displayName: user.displayName, bio: user.bio,
        avatar: user.avatar, hasBadge: user.hasBadge
      }
    });
  } catch (error) { next(error); }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Файл не загружен' });

    const user = await User.findById(req.user._id);
    if (user.avatarPath) await deleteFile(user.avatarPath);

    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `avatars/${user._id}/${uuidv4()}${ext}`;
    const publicUrl = await uploadFile(req.file.buffer, fileName, req.file.mimetype);

    user.avatar = publicUrl;
    user.avatarPath = fileName;
    await user.save();

    res.json({ success: true, avatar: publicUrl });
  } catch (error) { next(error); }
};

exports.uploadBanner = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Файл не загружен' });

    const user = await User.findById(req.user._id);
    if (user.bannerPath) await deleteFile(user.bannerPath);

    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `banners/${user._id}/${uuidv4()}${ext}`;
    const publicUrl = await uploadFile(req.file.buffer, fileName, req.file.mimetype);

    user.banner = publicUrl;
    user.bannerPath = fileName;
    await user.save();

    res.json({ success: true, banner: publicUrl });
  } catch (error) { next(error); }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false, message: 'Не найден' });

    const postCount = await Post.countDocuments({ author: user._id });
    const currentUser = req.user;
    const isFollowing = currentUser ? user.followers.includes(currentUser._id) : false;

    res.json({
      success: true,
      user: {
        _id: user._id, username: user.username, displayName: user.displayName,
        bio: user.bio, avatar: user.avatar, postCount,
        followersCount: user.followersCount, followingCount: user.followingCount,
        isFollowing, hasBadge: user.hasBadge, createdAt: user.createdAt
      }
    });
  } catch (error) { next(error); }
};

exports.getProfileById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Не найден' });

    const postCount = await Post.countDocuments({ author: user._id });
    const currentUser = req.user;
    const isFollowing = currentUser ? user.followers.includes(currentUser._id) : false;

    res.json({
      success: true,
      user: {
        _id: user._id, username: user.username, displayName: user.displayName,
        bio: user.bio, avatar: user.avatar, postCount,
        followersCount: user.followersCount, followingCount: user.followingCount,
        isFollowing, hasBadge: user.hasBadge, createdAt: user.createdAt
      }
    });
  } catch (error) { next(error); }
};

exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, users: [] });

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ]
    })
      .select('username displayName avatar bio hasBadge')
      .limit(20)
      .lean();

    res.json({ success: true, users });
  } catch (error) { next(error); }
};

exports.toggleFollow = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user._id;

    if (targetId === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Нельзя подписаться на себя' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Не найден' });

    const currentUser = await User.findById(userId);
    const isFollowing = currentUser.following.includes(targetId);

    if (isFollowing) {
      currentUser.following.pull(targetId);
      currentUser.followingCount = Math.max(0, currentUser.followingCount - 1);
      targetUser.followers.pull(userId);
      targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
    } else {
      currentUser.following.push(targetId);
      currentUser.followingCount += 1;
      targetUser.followers.push(userId);
      targetUser.followersCount += 1;

      // Автогалочка на 50 подписчиков
      if (targetUser.followersCount >= 50 && !targetUser.hasBadge) {
        targetUser.hasBadge = true;
      }

      await Notification.create({
        recipient: targetId,
        sender: userId,
        type: 'follow',
        message: `${currentUser.displayName || currentUser.username} подписался(ась) на вас`
      });
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: targetUser.followersCount
    });
  } catch (error) { next(error); }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username displayName avatar hasBadge')
      .lean();

    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true, notifications });
  } catch (error) { next(error); }
};