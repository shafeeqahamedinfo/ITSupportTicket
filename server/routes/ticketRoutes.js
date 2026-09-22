const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createTicket,
  getMyTickets,
  getTicketById,
  getMyStats,
  updateTicketStatus,
  addComment,
  submitFeedback,
  exportTicketsCSV,
  getAISuggestedSolution,
} = require('../controllers/ticketController');

// ── Multer: File Upload Config ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
  const ext     = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} is not allowed. Allowed: jpg, png, pdf, doc, docx`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB max, 5 files
});

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/export/csv',      protect, exportTicketsCSV);
router.get('/stats/my',        protect, getMyStats);
router.get('/my',              protect, getMyTickets);
router.get('/:id/ai-solution', protect, getAISuggestedSolution);
router.get('/:id',             protect, getTicketById);
router.post('/',               protect, upload.array('attachments', 5), createTicket);
router.post('/:id/comments',   protect, addComment);
router.post('/:id/feedback',   protect, submitFeedback);
router.patch('/:id/status',    protect, updateTicketStatus);

module.exports = router;
