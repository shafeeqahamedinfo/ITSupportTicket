const mongoose = require('mongoose');

/**
 * Comment Schema
 * Used for ticket communication between users and IT staff
 */
const commentSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName:  { type: String },
    authorRole:  { type: String },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    // Internal notes visible only to IT staff and admin
    isInternal: { type: Boolean, default: false },

    // Attachments in comments
    attachments: [
      {
        filename:     String,
        originalName: String,
        mimetype:     String,
        size:         Number,
        path:         String,
      },
    ],

    // Edited tracking
    isEdited:  { type: Boolean, default: false },
    editedAt:  { type: Date },
  },
  { timestamps: true }
);

commentSchema.index({ ticket: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
