const Ticket = require('../models/Ticket');

/**
 * Generates a unique ticket ID in the format: IT-YYYY-NNNNN
 * Example: IT-2026-00001
 */
const generateTicketId = async () => {
  const year = new Date().getFullYear();
  const prefix = `IT-${year}-`;

  // Find the highest ticket number for this year
  const lastTicket = await Ticket.findOne(
    { ticketId: new RegExp(`^${prefix}`) },
    { ticketId: 1 },
    { sort: { ticketId: -1 } }
  );

  let nextNumber = 1;
  if (lastTicket && lastTicket.ticketId) {
    const parts = lastTicket.ticketId.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

module.exports = { generateTicketId };
