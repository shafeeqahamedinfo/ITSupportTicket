const mongoose = require('mongoose');

/**
 * ActivityLog Schema
 * Records all important system actions for audit trail
 */
const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: { type: String },
    userEmail: { type: String },
    userRole:  { type: String },

    action: {
      type: String,
      required: true,
      enum: [
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_REGISTERED',
        'USER_UPDATED',
        'USER_DISABLED',
        'USER_ENABLED',
        'PASSWORD_CHANGED',
        'TICKET_CREATED',
        'TICKET_ASSIGNED',
        'TICKET_REASSIGNED',
        'TICKET_STATUS_CHANGED',
        'TICKET_RESOLVED',
        'TICKET_CLOSED',
        'TICKET_REOPENED',
        'COMMENT_ADDED',
        'ATTACHMENT_UPLOADED',
        'FEEDBACK_SUBMITTED',
        'DEPARTMENT_CREATED',
        'DEPARTMENT_UPDATED',
        'DEPARTMENT_DELETED',
        'CATEGORY_CREATED',
        'CATEGORY_UPDATED',
        'CATEGORY_DELETED',
        'ARTICLE_CREATED',
        'ARTICLE_UPDATED',
        'ADMIN_ACTION',
        'SLA_CONFIG_UPDATED',
        'SLA_BREACH',
      ],
    },

    description: { type: String, required: true },
    ipAddress:   { type: String },
    userAgent:   { type: String },

    // Reference to the entity affected (ticket, user, etc.)
    entity:   { type: String }, // e.g., 'Ticket', 'User'
    entityId: { type: mongoose.Schema.Types.ObjectId },

    metadata: { type: mongoose.Schema.Types.Mixed }, // Extra context
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ user: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
