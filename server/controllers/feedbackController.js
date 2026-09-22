const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Ticket = require('../models/Ticket');
const ActivityLog = require('../models/ActivityLog');

const logActivity = async (userId, action, description, req, extra = {}) => {
  try {
    await ActivityLog.create({
      user: userId, action, description,
      ipAddress: req?.ip,
      userAgent: req?.headers ? req.headers['user-agent'] : 'System',
      ...extra,
    });
  } catch (e) { console.error('Log error:', e.message); }
};

/**
 * @desc    Submit ticket feedback / CSAT rating
 * @route   POST /api/feedback
 * @access  Private (Ticket Creator)
 */
const submitFeedback = async (req, res) => {
  const { ticketId, rating, timelinessRating, comment } = req.body;

  const query = mongoose.Types.ObjectId.isValid(ticketId)
    ? { $or: [{ _id: ticketId }, { ticketId: ticketId }] }
    : { ticketId: ticketId };

  const ticket = await Ticket.findOne(query);

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found.' });
  }

  // Check authorization - only ticket creator can submit feedback
  if (ticket.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You can only submit feedback for your own tickets.' });
  }

  // Check if ticket is resolved/closed
  if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
    return res.status(400).json({ success: false, message: 'Feedback can only be provided for resolved or closed tickets.' });
  }

  // Check duplicate feedback
  const existing = await Feedback.findOne({ ticket: ticket._id });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Feedback has already been submitted for this ticket.' });
  }

  const deptId = mongoose.Types.ObjectId.isValid(ticket.department)
    ? ticket.department
    : (ticket.department?._id && mongoose.Types.ObjectId.isValid(ticket.department._id) ? ticket.department._id : null);

  const feedback = await Feedback.create({
    ticket: ticket._id,
    ticketId: ticket.ticketId,
    user: req.user._id,
    assignedStaff: ticket.assignedTo,
    department: deptId,
    rating: Number(rating),
    timelinessRating: timelinessRating ? Number(timelinessRating) : 5,
    comment,
  });

  // Mark ticket feedback flag
  ticket.isFeedbackSubmitted = true;
  await ticket.save();

  await logActivity(req.user._id, 'FEEDBACK_SUBMITTED', `Submitted ${rating}-star feedback for ${ticket.ticketId}`, req, {
    entity: 'Ticket', entityId: ticket._id,
  });

  res.status(201).json({ success: true, message: 'Thank you for your feedback!', feedback });
};

/**
 * @desc    Get feedback for a specific ticket
 * @route   GET /api/feedback/ticket/:ticketId
 * @access  Private
 */
const getTicketFeedback = async (req, res) => {
  const { ticketId } = req.params;
  const query = mongoose.Types.ObjectId.isValid(ticketId)
    ? { $or: [{ _id: ticketId }, { ticketId: ticketId }] }
    : { ticketId: ticketId };

  const ticket = await Ticket.findOne(query);

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found.' });
  }

  const feedback = await Feedback.findOne({ ticket: ticket._id })
    .populate('user', 'fullName email')
    .populate('assignedStaff', 'fullName email');

  res.status(200).json({ success: true, feedback });
};

/**
 * @desc    Get CSAT Analytics & Satisfaction Breakdown
 * @route   GET /api/feedback/csat
 * @access  Private (Admin / Staff)
 */
const getCSATMetrics = async (req, res) => {
  const feedbacks = await Feedback.find();
  const total = feedbacks.length;

  if (total === 0) {
    return res.status(200).json({
      success: true,
      metrics: {
        totalFeedbacks: 0,
        averageRating: 0,
        csatScore: 100, // CSAT % (4+5 star ratings)
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    });
  }

  const sumRating = feedbacks.reduce((acc, f) => acc + f.rating, 0);
  const avgRating = (sumRating / total).toFixed(2);

  const satisfiedCount = feedbacks.filter((f) => f.rating >= 4).length;
  const csatScore = ((satisfiedCount / total) * 100).toFixed(1);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  feedbacks.forEach((f) => {
    if (distribution[f.rating] !== undefined) distribution[f.rating]++;
  });

  // Recent comments
  const recentFeedback = await Feedback.find()
    .sort('-createdAt')
    .limit(10)
    .populate('user', 'fullName')
    .populate('assignedStaff', 'fullName')
    .populate('ticket', 'ticketId title');

  res.status(200).json({
    success: true,
    metrics: {
      totalFeedbacks: total,
      averageRating: Number(avgRating),
      csatScore: Number(csatScore),
      satisfiedCount,
      distribution,
      recentFeedback,
    },
  });
};

module.exports = {
  submitFeedback,
  getTicketFeedback,
  getCSATMetrics,
};
