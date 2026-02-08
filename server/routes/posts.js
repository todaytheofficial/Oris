// server/routes/posts.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const postController = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const { apiLimiter, postLimiter } = require('../middleware/rateLimiter');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/webp','image/gif',
      'audio/webm','audio/ogg','audio/mp3','audio/mpeg','audio/wav'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.use(apiLimiter);

router.get('/feed', protect, postController.getFeed);
router.get('/user/:userId', protect, postController.getUserPosts);
router.get('/user/:userId/likes', protect, postController.getUserLikedPosts);
router.post('/', protect, postLimiter, upload.single('media'), postController.createPost);
router.post('/:id/like', protect, postController.toggleLike);
router.post('/:id/bookmark', protect, postController.toggleBookmark);
router.delete('/:id', protect, postController.deletePost);

// Комментарии
router.get('/:id/comments', protect, postController.getComments);

module.exports = router;