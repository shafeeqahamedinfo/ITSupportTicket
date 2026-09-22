const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { submitFeedback, getTicketFeedback, getCSATMetrics } = require('../controllers/feedbackController');

router.use(protect);

router.post('/', submitFeedback);
router.get('/ticket/:ticketId', getTicketFeedback);
router.get('/csat', authorize('admin', 'it_staff'), getCSATMetrics);

module.exports = router;
