module.exports = (req, res, next) => {
  if(!req.user || (req.user.role !== 'admin' && req.user.role !== 'creator')){
    return res.status(403).json({error:'Нет доступа'});
  }
  next();
};