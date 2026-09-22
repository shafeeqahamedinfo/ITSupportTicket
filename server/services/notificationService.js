const Notification = require('../models/Notification');

/**
 * createNotification
 * Saves a notification to DB and emits it via Socket.IO to the recipient.
 *
 * Emits to:
 *   - user:<userId>  (new room format, used by SocketContext.jsx)
 *   - <userId>       (legacy room, backward compat)
 *
 * Emits events:
 *   - notification:new   → delivered to the recipient's socket rooms
 *   - ticket:statusChanged → delivered to the ticket-specific room
 */
const createNotification = async ({
  recipient, type, title, message, ticket, ticketId, metadata, io,
}) => {
  try {
    const notif = await Notification.create({
      recipient, type, title, message,
      ticket:   ticket   || null,
      ticketId: ticketId || null,
      metadata: metadata || {},
    });

    if (io && recipient) {
      const recipientStr = recipient.toString();
      const payload = {
        _id:       notif._id,
        type:      notif.type,
        title:     notif.title,
        message:   notif.message,
        ticket:    notif.ticket,
        ticketId:  notif.ticketId,
        isRead:    false,
        createdAt: notif.createdAt,
      };

      // Emit to both room formats for compatibility
      io.to(`user:${recipientStr}`).emit('notification:new', payload);
      io.to(recipientStr).emit('notification:new', payload);
    }

    return notif;
  } catch (err) {
    console.error('❌ Notification creation error:', err.message);
    return null;
  }
};

/**
 * emitTicketStatusChange
 * Broadcasts a ticket status change to everyone watching that ticket.
 * Called after status updates in staffController / adminController.
 */
const emitTicketStatusChange = (io, ticket, changedBy) => {
  if (!io || !ticket) return;

  const payload = {
    ticketId:   ticket._id,
    ticketCode: ticket.ticketId,
    status:     ticket.status,
    priority:   ticket.priority,
    changedBy:  changedBy?.fullName || 'System',
    timestamp:  new Date().toISOString(),
  };

  // Emit to ticket-specific room (users watching the detail page)
  io.to(`ticket:${ticket._id}`).emit('ticket:statusChanged', payload);

  // Also emit to admin room so admins see live updates
  io.to('role:admin').emit('ticket:statusChanged', payload);
};

/**
 * emitSlaWarning
 * Broadcasts an SLA warning to the assigned staff member and admins.
 */
const emitSlaWarning = (io, ticket, remainingText) => {
  if (!io || !ticket) return;

  const payload = {
    ticketId:  ticket.ticketId,
    title:     ticket.title,
    priority:  ticket.priority,
    remaining: remainingText,
    timestamp: new Date().toISOString(),
  };

  // Warn assigned staff
  if (ticket.assignedTo) {
    io.to(`user:${ticket.assignedTo}`).emit('sla:warning', payload);
  }

  // Alert all admins
  io.to('role:admin').emit('sla:warning', payload);
};

module.exports = { createNotification, emitTicketStatusChange, emitSlaWarning };
