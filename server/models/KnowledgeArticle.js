const mongoose = require('mongoose');

/**
 * KnowledgeArticle Schema
 * Stores self-service KB articles, guides, and troubleshooting steps.
 */
const knowledgeArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Hardware', 'Software', 'Network & Wi-Fi', 'Account & Access', 'Email & Cloud', 'General'],
      default: 'General',
    },
    content: {
      type: String,
      required: [true, 'Article content is required'],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    views: {
      type: Number,
      default: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    unhelpfulCount: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeArticle', knowledgeArticleSchema);
