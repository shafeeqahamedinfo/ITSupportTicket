/**
 * slaMonitor.js
 * Background job that runs every 15 minutes to:
 * 1. Detect tickets about to breach SLA → emit sla:warning to staff + admins
 * 2. Mark breached SLA tickets in DB → emit sla:breached notification
 *
 * Called from server.js after io is initialized.
 */
const Ticket      = require('../models/Ticket');
const { createNotification, emitSlaWarning } = require('./notificationService');

const SLA_WARNING_MINUTES = 60; // warn when 1 hour remains

/**
 * Format remaining time as a human-readable string.
 */
function formatRemaining(ms) {
  if (ms <= 0) return 'OVERDUE';
  const hrs  = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Run the SLA monitor check.
 * @param {object} io - Socket.IO server instance
 */
const runSlaCheck = async (io) => {
  try {
    const now     = new Date();
    const warning = new Date(now.getTime() + SLA_WARNING_MINUTES * 60000);

    // ─── Tickets about to breach ────────────────────────────────────────────
    const aboutToBreach = await Ticket.find({
      status:      { $nin: ['RESOLVED', 'CLOSED'] },
      slaBreached: { $ne: true },
      slaDeadline: { $gte: now, $lte: warning },
    }).populate('assignedTo', 'fullName');

    for (const ticket of aboutToBreach) {
      const remaining = new Date(ticket.slaDeadline) - now;
      const remainingText = formatRemaining(remaining);

      emitSlaWarning(io, ticket, remainingText);
      console.log(`⚠️  SLA Warning: ${ticket.ticketId} – ${remainingText} remaining`);
    }

    // ─── Tickets that have already breached ─────────────────────────────────
    const justBreached = await Ticket.find({
      status:      { $nin: ['RESOLVED', 'CLOSED'] },
      slaBreached: { $ne: true },
      slaDeadline: { $lt: now },
    }).populate('assignedTo', '_id fullName')
      .populate('createdBy', '_id');

    for (const ticket of justBreached) {
      // Mark as breached in DB
      await Ticket.findByIdAndUpdate(ticket._id, { slaBreached: true });

      // Notify assigned staff
      if (ticket.assignedTo) {
        await createNotification({
          recipient: ticket.assignedTo._id,
          type:      'SLA_BREACHED',
          title:     `🚨 SLA Breached: ${ticket.ticketId}`,
          message:   `Ticket "${ticket.title}" has exceeded its SLA deadline. Immediate action required!`,
          ticket:    ticket._id,
          ticketId:  ticket.ticketId,
          io,
        });
      }

      // Notify admins via role room
      if (io) {
        io.to('role:admin').emit('notification:new', {
          type:     'SLA_BREACHED',
          title:    `🚨 SLA Breached: ${ticket.ticketId}`,
          message:  `Ticket "${ticket.title}" (${ticket.priority}) breached SLA.`,
          ticketId: ticket.ticketId,
          isRead:   false,
          createdAt: new Date().toISOString(),
        });
      }

      console.log(`🚨 SLA Breached: ${ticket.ticketId} – ${ticket.title}`);
    }

    if (aboutToBreach.length > 0 || justBreached.length > 0) {
      console.log(`🕐 SLA check: ${aboutToBreach.length} warning(s), ${justBreached.length} breach(es)`);
    }

  } catch (err) {
    console.error('SLA Monitor error:', err.message);
  }
};

/**
 * Start the SLA monitor background job.
 * @param {object} io - Socket.IO server instance
 * @param {number} intervalMs - How often to check (default: 15 min)
 */
const startSlaMonitor = (io, intervalMs = 15 * 60 * 1000) => {
  console.log(`⏱  SLA Monitor started (interval: ${intervalMs / 60000}m)`);

  // Run once immediately, then on interval
  setTimeout(() => runSlaCheck(io), 5000); // 5s delay after server start
  setInterval(() => runSlaCheck(io), intervalMs);
};

module.exports = { startSlaMonitor };
