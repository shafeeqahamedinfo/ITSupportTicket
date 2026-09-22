const Comment = require('../models/Comment');
const Ticket  = require('../models/Ticket');
const { createNotification } = require('../services/notificationService');
const { findTicketByIdOrIdString } = require('../utils/ticketLookup');

/**
 * @desc    Get all comments for a ticket
 * @route   GET /api/tickets/:id/comments
 * @access  Private
 */
const getComments = async (req, res) => {
  const ticket = await findTicketByIdOrIdString(req.params.id);

  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  // Users can only see non-internal comments on their own tickets
  if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const query = { ticket: ticket._id };
  if (req.user.role === 'user') {
    query.isInternal = false;
  }

  let comments = await Comment.find(query)
    .populate('author', 'fullName email role')
    .sort('createdAt');

  // Fallback: If Comment collection is empty but ticket.comments array has items, format and return them
  if (comments.length === 0 && ticket.comments?.length > 0) {
    comments = ticket.comments
      .filter(c => !(req.user.role === 'user' && c.isInternal))
      .map(c => ({
        _id: c._id,
        ticket: ticket._id,
        author: { _id: c.sender, fullName: c.senderName, role: c.senderRole },
        authorName: c.senderName,
        authorRole: c.senderRole,
        content: c.message,
        isInternal: c.isInternal,
        createdAt: c.createdAt,
      }));
  }

  res.status(200).json({ success: true, comments });
};

/**
 * @desc    Add a comment to a ticket
 * @route   POST /api/tickets/:id/comments
 * @access  Private
 */
const addComment = async (req, res) => {
  const { content, message, isInternal } = req.body;
  const commentText = (content || message || '').trim();

  if (!commentText) {
    return res.status(400).json({ success: false, message: 'Comment content is required.' });
  }

  const ticket = await findTicketByIdOrIdString(req.params.id);

  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  // Users can only comment on their own tickets
  if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Only staff/admin can post internal notes
  const internal = (isInternal === true || isInternal === 'true') && req.user.role !== 'user';

  const comment = await Comment.create({
    ticket:     ticket._id,
    author:     req.user._id,
    authorName: req.user.fullName,
    authorRole: req.user.role,
    content:    commentText,
    isInternal: internal,
  });

  // Sync to embedded ticket.comments array
  ticket.comments.push({
    sender:     req.user._id,
    senderName: req.user.fullName,
    senderRole: req.user.role,
    message:    commentText,
    isInternal: internal,
    createdAt:  new Date(),
  });

  // Push to ticket history
  ticket.history.push({
    action: 'COMMENT_ADDED',
    description: internal ? `Internal note added by ${req.user.fullName}` : `Comment added by ${req.user.fullName}`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
  });
  await ticket.save({ validateBeforeSave: false });

  // Notify the other party
  if (!internal) {
    const recipientId =
      req.user._id.toString() === ticket.createdBy.toString()
        ? ticket.assignedTo
        : ticket.createdBy;

    if (recipientId) {
      await createNotification({
        recipient: recipientId,
        type: 'COMMENT_ADDED',
        title: 'New Comment on Ticket',
        message: `${req.user.fullName} commented on ticket ${ticket.ticketId}: "${commentText.slice(0, 80)}…"`,
        ticket:   ticket._id,
        ticketId: ticket.ticketId,
        io: req.io,
      });
    }
  }

  const populated = await Comment.findById(comment._id).populate('author', 'fullName email role');

  // Emit real-time comment updates
  if (req.io) {
    req.io.to(`ticket:${ticket._id}`).emit('comment:new', populated);
    req.io.emit(`ticket:${ticket.ticketId}:comment`, {
      _id: comment._id,
      sender: req.user._id,
      senderName: req.user.fullName,
      senderRole: req.user.role,
      message: commentText,
      isInternal: internal,
      createdAt: new Date(),
    });
  }

  res.status(201).json({
    success: true,
    message: 'Comment added successfully.',
    comment: populated,
  });
};

module.exports = { getComments, addComment };
