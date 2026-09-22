const mongoose = require('mongoose');

/**
 * SLAConfig Schema
 * Stores SLA deadlines and escalation policies per priority level.
 */
const slaConfigSchema = new mongoose.Schema(
  {
    priority: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      required: true,
      unique: true,
    },
    responseTimeHours: {
      type: Number,
      required: true,
      min: 0.5,
      max: 168,
    },
    resolutionTimeHours: {
      type: Number,
      required: true,
      min: 1,
      max: 720,
    },
    escalateAfterBreachHours: {
      type: Number,
      default: 2, // Auto escalate 2 hours after breach
    },
    autoEscalateToRole: {
      type: String,
      enum: ['admin', 'it_staff'],
      default: 'admin',
    },
    notifyDeptHead: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SLAConfig', slaConfigSchema);
