const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getSLAConfigs,
  updateSLAConfig,
  getSLAReports,
  getBreachedTickets,
  escalateTicket,
} = require('../controllers/slaController');

// All SLA routes require authentication
router.use(protect);

router.get('/configs', getSLAConfigs);
router.put('/configs/:priority', authorize('admin'), updateSLAConfig);
router.get('/reports', getSLAReports);
router.get('/breached', getBreachedTickets);
router.patch('/escalate/:id', authorize('admin', 'it_staff'), escalateTicket);

module.exports = router;
