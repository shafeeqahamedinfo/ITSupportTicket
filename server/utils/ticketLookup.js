const mongoose = require('mongoose');
const Ticket   = require('../models/Ticket');

/**
 * Helper: Find Ticket by ObjectId string or TicketId string (e.g. TICK-1001)
 * Safely avoids Mongoose CastError when string is not a valid 24-char ObjectId
 */
const findTicketByIdOrIdString = (id) => {
  if (!id) return null;
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { ticketId: id }] }
    : { ticketId: id };
  return Ticket.findOne(query);
};

module.exports = { findTicketByIdOrIdString };
