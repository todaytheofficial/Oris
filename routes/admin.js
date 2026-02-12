const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Статистика
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({registrationStep:4});
    const bannedUsers = await User.countDocuments({banned:true});
    const totalPosts = await Post.countDocuments();
    const verifiedUsers = await User.countDocuments({verifiedBadge:true});
    const admins = await User.countDocuments({role:{$in:['admin','creator']}});

    const today = new Date();
    today.setHours(0,0,0,0);
    const newUsersToday = await User.countDocuments({createdAt:{$gte:today},registrationStep:4});
    const newPostsToday = await Post.countDocuments({createdAt:{$gte:today}});

    res.json({totalUsers,bannedUsers,totalPosts,verifiedUsers,admins,newUsersToday,newPostsToday});
  } catch(err){
    res.status(500).json({error:'Ошибка сервера'});
  }
});

// Поиск юзера по username
router.get('/user/:username', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({username:req.params.username.toLowerCase()})
      .select('-verificationCode -verificationCodeExpires');
    if(!user)return res.status(404).json({error:'Пользователь не найден'});

    const postsCount = await Post.countDocuments({author:user._id});

    res.json({
      user,
      postsCount,
      followersCount:user.followers.length,
      followingCount:user.following.length
    });
  } catch(err){
    res.status(500).json({error:'Ошибка сервера'});
  }
});

// Забанить
router.post('/ban/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {reason} = req.body;
    const target = await User.findById(req.params.userId);
    if(!target)return res.status(404).json({error:'Пользователь не найден'});

    // Нельзя банить создателя
    if(target.role === 'creator'){
      return res.status(403).json({error:'Нельзя забанить создателя'});
    }
    // Админ не может банить другого админа
    if(target.role === 'admin' && req.user.role !== 'creator'){
      return res.status(403).json({error:'Только создатель может банить админов'});
    }

    await User.findByIdAndUpdate(req.params.userId,{
      banned:true,
      banReason:reason||'Нарушение правил',
      bannedAt:new Date(),
      bannedBy:req.user.username
    });

    res.json({success:true,message:'Пользователь забанен'});
  } catch(err){
    res.status(500).json({error:'Ошибка сервера'});
  }
});

// Разбанить
router.post('/unban/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId,{
      banned:false,
      banReason:'',
      bannedAt:null,
      bannedBy:''
    });
    res.json({success:true,message:'Бан снят'});
  } catch(err){
    res.status(500).json({error:'Ошибка сервера'});
  }
});

// Удалить аккаунт
router.delete('/user/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if(!target)return res.status(404).json({error:'Не найден'});

    if(target.role === 'creator'){
      return res.status(403).json({error:'Нельзя удалить создателя'});
    }
    if(target.role === 'admin' && req.user.role !== 'creator'){
      return res.status(403).json({error:'Только создатель может удалить админа'});
    }

    // Удаляем посты
    await Post.deleteMany({author:req.params.userId});
    // Удаляем из подписок
    await User.updateMany({followers:req.params.userId},{$pull:{followers:req.params.userId}});
    await User.updateMany({following:req.params.userId},{$pull:{following:req.params.userId}});
    // Удаляем юзера
    await User.findByIdAndDelete(req.params.userId);

    res.json({success:true,message:'Аккаунт удалён'});
  } catch(err){
    res.status(500).json({error:'Ошибка сервера'});
  }
});

// Выдать/снять галочку
router.post('/verify/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if(!target)return res.status(404).json({error:'Не найден'});

    const newVal = !target.verifiedBadge;
    await User.findByIdAndUpdate(req.params.userId,{verifiedBadge:newVal});

    res.json({success:true,verifiedBadge:newVal,message:newVal?'Галочка выдана':'Галочка снята'});
  } catch(err){
    res.status(500).json({error:'Ошибка сервера'});
  }
});

// Выдать/снять админку (только создатель)
router.post('/set-admin/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if(req.user.role !== 'creator'){
      return res.status(403).json({error:'Только создатель может управлять админами'});
    }

    const target = await User.findById(req.params.userId);
    if(!target)return res.status(404).json({error:'Не найден'});
    if(target.role === 'creator')return res.status(403).json({error:'Нельзя изменить роль создателя'});

    const newRole = target.role === 'admin' ? 'user' : 'admin';
    await User.findByIdAndUpdate(req.params.userId,{role:newRole});

    res.json({success:true,role:newRole,message:newRole==='admin'?'Админка выдана':'Админка снята'});
  } catch(err){
    res.status(500).json({error:'Ошибка сервера'});
  }
});

// Проверка бана (без auth — для ban.html)
router.get('/check-ban/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('banned banReason bannedAt bannedBy username name');
    if(!user)return res.status(404).json({error:'Не найден'});
    res.json({banned:user.banned,reason:user.banReason,bannedAt:user.bannedAt,bannedBy:user.bannedBy,username:user.username,name:user.name});
  } catch(err){
    res.status(500).json({error:'Ошибка'});
  }
});

module.exports = router;