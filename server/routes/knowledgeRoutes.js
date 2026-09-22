const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getArticles, getArticleById, createArticle, rateArticle } = require('../controllers/knowledgeController');

router.get('/', getArticles);
router.get('/:id', getArticleById);
router.post('/', protect, authorize('admin', 'it_staff'), createArticle);
router.patch('/:id/rate', protect, rateArticle);

module.exports = router;
