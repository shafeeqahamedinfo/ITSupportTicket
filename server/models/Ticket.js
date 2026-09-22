const mongoose = require('mongoose');

/**
 * Ticket Schema
 * Core entity of SmartCampus ITCare
 */
const ticketSchema = new mongoose.Schema(
  {
    // ── Identification ──────────────────────────────────────
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },

    // ── Basic Info ──────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
    },

    // ── Classification ──────────────────────────────────────
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Hardware', 'Software', 'Network', 'Wi-Fi', 'Printer',
        'Projector', 'Email', 'Account/Login', 'Operating System',
        'Application', 'Cybersecurity', 'Other',
      ],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },

    // ── Location ────────────────────────────────────────────
    location: {
      building: { type: String, trim: true },
      room:     { type: String, trim: true },
      floor:    { type: String, trim: true },
      details:  { type: String, trim: true },
    },

    // ── Priority (user-selected + smart-calculated) ─────────
    userPriority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },

    // Smart priority inputs
    affectedUsers: { type: Number, default: 1, min: 1 },
    urgency: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    serviceImpact: {
      type: String,
      enum: ['NONE', 'MINOR', 'MODERATE', 'MAJOR', 'COMPLETE_OUTAGE'],
      default: 'MINOR',
    },

    // ── Status ──────────────────────────────────────────────
    status: {
      type: String,
      enum: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED', 'REOPENED'],
      default: 'NEW',
      index: true,
    },

    // ── People ──────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: { type: Date },

    // ── Attachments ─────────────────────────────────────────
    attachments: [
      {
        filename:     { type: String },
        originalName: { type: String },
        mimetype:     { type: String },
        size:         { type: Number },
        path:         { type: String },
        uploadedAt:   { type: Date, default: Date.now },
      },
    ],

    // ── SLA ─────────────────────────────────────────────────
    slaDeadline:    { type: Date },
    slaBreached:    { type: Boolean, default: false },
    resolvedAt:     { type: Date },
    closedAt:       { type: Date },
    resolutionTime: { type: Number }, // in milliseconds

    // ── Comments & Real-time Chat ───────────────────────────
    comments: [
      {
        sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        senderName: { type: String, required: true },
        senderRole: { type: String, required: true },
        message:    { type: String, required: true, trim: true },
        isInternal: { type: Boolean, default: false },
        createdAt:  { type: Date, default: Date.now },
      },
    ],

    // ── Feedback ────────────────────────────────────────────
    feedback: {
      rating:    { type: Number, min: 1, max: 5 },
      comment:   { type: String, trim: true },
      givenAt:   { type: Date },
    },

    // ── Internal Notes ──────────────────────────────────────
    resolution: { type: String, trim: true },
    internalNotes: { type: String, trim: true },

    // ── History ─────────────────────────────────────────────
    history: [
      {
        action:      { type: String },
        description: { type: String },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByName: { type: String },
        timestamp:   { type: Date, default: Date.now },
        oldValue:    { type: String },
        newValue:    { type: String },
      },
    ],

    // ── Tags ────────────────────────────────────────────────
    tags: [{ type: String, lowercase: true, trim: true }],

    // ── Reopen count ────────────────────────────────────────
    reopenCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound Indexes ───────────────────────────────────────────────────────────
ticketSchema.index({ createdBy: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ priority: 1, status: 1 });
ticketSchema.index({ slaDeadline: 1 });
ticketSchema.index({ createdAt: -1 });

// ── Virtual: isOverdue ─────────────────────────────────────────────────────────
ticketSchema.virtual('isOverdue').get(function () {
  if (!this.slaDeadline) return false;
  if (['RESOLVED', 'CLOSED'].includes(this.status)) {
    return this.resolvedAt
      ? new Date(this.resolvedAt) > new Date(this.slaDeadline)
      : false;
  }
  return new Date() > new Date(this.slaDeadline);
});

// ── Virtual: slaStatus ────────────────────────────────────────────────────────
ticketSchema.virtual('slaStatus').get(function () {
  if (!this.slaDeadline) return 'N/A';
  const now = new Date();
  const deadline = new Date(this.slaDeadline);
  if (this.isOverdue) return 'BREACHED';
  const diff = deadline - now;
  if (diff < 3600000) return 'CRITICAL'; // < 1 hour left
  if (diff < 7200000) return 'WARNING';  // < 2 hours left
  return 'ON_TRACK';
});

module.exports = mongoose.model('Ticket', ticketSchema);
