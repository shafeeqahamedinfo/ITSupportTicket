const KnowledgeArticle = require('../models/KnowledgeArticle');

const DEFAULT_ARTICLES = [
  {
    title: 'How to Connect to Campus Wi-Fi (SmartCampus-Secure)',
    category: 'Network & Wi-Fi',
    summary: 'Step-by-step guide to connect laptops, smartphones, and tablets to the campus high-speed Wi-Fi network.',
    content: `### Campus Wi-Fi Connection Guide

1. Select **SmartCampus-Secure** from your list of available Wi-Fi networks.
2. When prompted for identity, enter your **Student/Staff Email** (e.g. \`student@smartcampus.edu\`).
3. Enter your campus portal password.
4. If prompted to accept the SSL Security Certificate, click **Trust / Accept**.
5. For Android users, set EAP Method to **PEAP** and Phase 2 Authentication to **MSCHAPv2**.

*If you experience connection drops, forget the network and re-authenticate.*`,
    tags: ['wifi', 'network', 'connect', 'internet'],
    helpfulCount: 42,
    unhelpfulCount: 1,
  },
  {
    title: 'Resetting Your Campus Portal & LMS Password',
    category: 'Account & Access',
    summary: 'Learn how to self-reset your forgotten password or unlock a locked campus account.',
    content: `### Password Self-Reset Procedure

1. Visit the **Self-Service Portal** at \`https://id.smartcampus.edu/forgot\`.
2. Enter your registered email address or Student ID number.
3. Check your registered recovery email for a 6-digit verification code.
4. Enter the verification code and set a new password meeting requirements:
   - At least 8 characters
   - Include uppercase letter, lowercase letter, number, and special symbol (@, $, #).

*Account lockouts automatically expire after 15 minutes of inactivity.*`,
    tags: ['password', 'reset', 'lms', 'account', 'login'],
    helpfulCount: 38,
    unhelpfulCount: 2,
  },
  {
    title: 'Setting Up Campus Email on Outlook Mobile & iOS Mail',
    category: 'Email & Cloud',
    summary: 'Configure your official university email account on mobile devices and tablet apps.',
    content: `### Microsoft Outlook Setup

1. Download **Microsoft Outlook** from Apple App Store or Google Play Store.
2. Open Outlook and tap **Add Account**.
3. Type your full university email address (\`name@smartcampus.edu\`).
4. You will be redirected to the SmartCampus SSO login page. Authenticate with your credentials.
5. Grant required permissions and complete setup!`,
    tags: ['email', 'outlook', 'mobile', 'setup'],
    helpfulCount: 29,
    unhelpfulCount: 0,
  },
  {
    title: 'Requesting Software & Lab License Access',
    category: 'Software',
    summary: 'How students and faculty can request MATLAB, AutoCAD, SPSS, or Adobe Creative Cloud access.',
    content: `### Software Access Request Process

1. Submit an IT Ticket selecting the **Software** category.
2. Include your Course Name, Instructor Name, and required software package in the description.
3. Software licenses are granted within 24 hours of advisor approval.`,
    tags: ['software', 'license', 'matlab', 'autocad', 'lab'],
    helpfulCount: 19,
    unhelpfulCount: 1,
  },
];

/**
 * @desc    Get knowledge base articles (seeds defaults if empty)
 * @route   GET /api/knowledge-base
 * @access  Public / Private
 */
const getArticles = async (req, res) => {
  const { category, search } = req.query;

  let articles = await KnowledgeArticle.find().sort('-views');

  if (articles.length === 0) {
    articles = await KnowledgeArticle.insertMany(DEFAULT_ARTICLES);
  }

  let filtered = articles;

  if (category && category !== 'All') {
    filtered = filtered.filter((a) => a.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  res.status(200).json({ success: true, count: filtered.length, articles: filtered });
};

/**
 * @desc    Get single article by ID & increment view count
 * @route   GET /api/knowledge-base/:id
 * @access  Public / Private
 */
const getArticleById = async (req, res) => {
  const article = await KnowledgeArticle.findById(req.params.id);

  if (!article) {
    return res.status(404).json({ success: false, message: 'Article not found.' });
  }

  article.views += 1;
  await article.save();

  res.status(200).json({ success: true, article });
};

/**
 * @desc    Create new Knowledge Article
 * @route   POST /api/knowledge-base
 * @access  Private (Admin / Staff)
 */
const createArticle = async (req, res) => {
  const { title, category, summary, content, tags } = req.body;

  const article = await KnowledgeArticle.create({
    title,
    category,
    summary,
    content,
    tags: Array.isArray(tags) ? tags : tags ? tags.split(',').map((t) => t.trim()) : [],
    author: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Article published successfully.', article });
};

/**
 * @desc    Rate article helpfulness
 * @route   PATCH /api/knowledge-base/:id/rate
 * @access  Private
 */
const rateArticle = async (req, res) => {
  const { helpful } = req.body; // boolean
  const article = await KnowledgeArticle.findById(req.params.id);

  if (!article) {
    return res.status(404).json({ success: false, message: 'Article not found.' });
  }

  if (helpful) {
    article.helpfulCount += 1;
  } else {
    article.unhelpfulCount += 1;
  }

  await article.save();

  res.status(200).json({
    success: true,
    message: helpful ? 'Thank you for your feedback!' : 'Feedback recorded.',
    article,
  });
};

module.exports = {
  getArticles,
  getArticleById,
  createArticle,
  rateArticle,
};
