// server/routes/notifications.js
const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);

module.exports = router;