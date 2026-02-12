const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if(authHeader && authHeader.startsWith('Bearer '))token = authHeader.split(' ')[1];
    if(!token && req.cookies && req.cookies.oris_token)token = req.cookies.oris_token;
    if(!token)return res.status(401).json({error:'Не авторизован'});

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-verificationCode -verificationCodeExpires');
    if(!user)return res.status(401).json({error:'Пользователь не найден'});

    // Проверка бана
    if(user.banned){
      return res.status(403).json({error:'banned',reason:user.banReason||'Нарушение правил'});
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch(err) {
    return res.status(401).json({error:'Токен невалиден'});
  }
};