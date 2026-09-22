const mongoose = require('mongoose');

/**
 * Notification Schema
 * Stores in-app notifications for users and staff
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'TICKET_CREATED',
        'TICKET_ASSIGNED',
        'TICKET_REASSIGNED',
        'STATUS_CHANGED',
        'COMMENT_ADDED',
        'TICKET_RESOLVED',
        'TICKET_CLOSED',
        'TICKET_REOPENED',
        'SLA_WARNING',
        'SLA_BREACHED',
        'FEEDBACK_RECEIVED',
        'SYSTEM',
      ],
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    isRead:  { type: Boolean, default: false, index: true },

    // Reference to the related ticket (if any)
    ticket:   { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
    ticketId: { type: String },

    // Extra metadata
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
