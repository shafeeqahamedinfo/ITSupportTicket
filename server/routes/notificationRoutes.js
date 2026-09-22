/**
 * Notification Routes – /api/notifications/*
 * Available to all authenticated users (users also get notifications).
 */
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getNotifications, markNotificationsRead } = require('../controllers/staffController');

router.get('/',            protect, getNotifications);
router.patch('/read',      protect, markNotificationsRead);
router.patch('/read-all',  protect, markNotificationsRead);
router.patch('/:id/read',  protect, async (req, res, next) => {
  req.body.ids = [req.params.id];
  markNotificationsRead(req, res, next);
});

module.exports = router;
