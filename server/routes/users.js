// server/routes/users.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  updateProfile, uploadAvatar, getProfile, getProfileById,
  searchUsers, toggleFollow, getNotifications, uploadBanner
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype));
  }
});

router.use(apiLimiter);

router.get('/search', protect, searchUsers);
router.get('/id/:id', protect, getProfileById);
router.get('/:username', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/banner', protect, upload.single('banner'), uploadBanner);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/:id/follow', protect, toggleFollow);

module.exports = router;