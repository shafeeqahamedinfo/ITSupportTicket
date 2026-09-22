const Ticket       = require('../models/Ticket');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const ActivityLog  = require('../models/ActivityLog');
const { createNotification } = require('../services/notificationService');
const { findTicketByIdOrIdString } = require('../utils/ticketLookup');

// ─── Helper: Log Activity ─────────────────────────────────────────────────────
const logActivity = async (userId, action, description, req, extra = {}) => {
  try {
    await ActivityLog.create({
      user: userId, action, description,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      ...extra,
    });
  } catch (e) { console.error('Log error:', e.message); }
};

/**
 * @desc    Get IT Staff dashboard stats
 * @route   GET /api/staff/stats
 * @access  Private (it_staff)
 */
const getStaffStats = async (req, res) => {
  const staffId = req.user._id;

  const [
    assigned, assignedByStatus, assignedByPriority,
    availableCount, resolvedToday, resolutionTimes,
    recentActivity, slaBreached,
  ] = await Promise.all([
    // Total assigned to this staff member (active)
    Ticket.countDocuments({ assignedTo: staffId, status: { $nin: ['CLOSED'] } }),

    // Assigned by status
    Ticket.aggregate([
      { $match: { assignedTo: staffId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Assigned by priority
    Ticket.aggregate([
      { $match: { assignedTo: staffId, status: { $nin: ['CLOSED','RESOLVED'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),

    // Unassigned available tickets
    Ticket.countDocuments({
      assignedTo: null,
      status: 'NEW',
    }),

    // Resolved today
    Ticket.countDocuments({
      assignedTo: staffId,
      status: { $in: ['RESOLVED', 'CLOSED'] },
      resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),

    // Average resolution time
    Ticket.aggregate([
      { $match: { assignedTo: staffId, resolutionTime: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } },
    ]),

    // Recent activity (last 10 assigned tickets)
    Ticket.find({ assignedTo: staffId })
      .sort('-updatedAt')
      .limit(8)
      .populate('createdBy', 'fullName')
      .select('ticketId title status priority category updatedAt slaDeadline createdBy'),

    // SLA breached tickets assigned to staff
    Ticket.countDocuments({
      assignedTo: staffId,
      slaBreached: true,
      status: { $nin: ['CLOSED'] },
    }),
  ]);

  // Normalize status counts
  const statusMap = { NEW: 0, ASSIGNED: 0, IN_PROGRESS: 0, WAITING_FOR_USER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0 };
  assignedByStatus.forEach(({ _id, count }) => { statusMap[_id] = count; });

  const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  assignedByPriority.forEach(({ _id, count }) => { priorityMap[_id] = count; });

  const avgResolutionMs = resolutionTimes[0]?.avgTime || 0;
  const avgResolutionHrs = (avgResolutionMs / 3600000).toFixed(1);

  // Monthly resolution trend (last 6 months)
  const monthlyResolved = await Ticket.aggregate([
    {
      $match: {
        assignedTo: staffId,
        status: { $in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 3600000) },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$resolvedAt' }, month: { $month: '$resolvedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyTrend = monthlyResolved.map(({ _id, count }) => ({
    month: `${MONTHS[_id.month - 1]} ${_id.year}`,
    resolved: count,
  }));

  res.status(200).json({
    success: true,
    stats: {
      assignedTotal:    assigned,
      resolvedToday,
      availableTickets: availableCount,
      slaBreached,
      avgResolutionHrs,
      byStatus:  statusMap,
      byPriority: priorityMap,
      recentActivity,
      monthlyTrend,
      // Performance score
      performanceScore: Math.min(100, Math.round(
        (req.user.ticketsResolved || 0) * 2 +
        (req.user.averageRating || 0) * 10
      )),
    },
  });
};

/**
 * @desc    Get all tickets assigned to logged-in staff member
 * @route   GET /api/staff/tickets/assigned
 * @access  Private (it_staff)
 */
const getAssignedTickets = async (req, res) => {
  const {
    status, priority, category, search,
    page = 1, limit = 10, sort = '-updatedAt',
  } = req.query;

  const query = { assignedTo: req.user._id };
  if (status)   query.status   = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { title:    { $regex: search, $options: 'i' } },
      { ticketId: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const skip     = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('createdBy', 'fullName email departmentName')
      .sort(sort).skip(skip).limit(limitNum),
    Ticket.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    tickets,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), hasMore: pageNum < Math.ceil(total / limitNum) },
  });
};

/**
 * @desc    Get available (unassigned) tickets for staff to pick up
 * @route   GET /api/staff/tickets/available
 * @access  Private (it_staff)
 */
const getAvailableTickets = async (req, res) => {
  const { priority, category, page = 1, limit = 10 } = req.query;

  const query = { assignedTo: null, status: { $in: ['NEW', 'REOPENED'] } };
  if (priority) query.priority = priority;
  if (category) query.category = category;

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const skip     = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('createdBy', 'fullName email departmentName')
      .sort('-priority -createdAt') // CRITICAL first
      .skip(skip).limit(limitNum),
    Ticket.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    tickets,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum), hasMore: pageNum < Math.ceil(total / limitNum) },
  });
};

/**
 * @desc    Self-assign an available ticket
 * @route   POST /api/staff/tickets/:id/assign-self
 * @access  Private (it_staff)
 */
const selfAssignTicket = async (req, res) => {
  const ticket = await findTicketByIdOrIdString(req.params.id);

  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
  if (ticket.assignedTo) return res.status(400).json({ success: false, message: 'This ticket is already assigned.' });

  ticket.assignedTo = req.user._id;
  ticket.assignedAt = new Date();
  ticket.status     = 'ASSIGNED';
  ticket.history.push({
    action: 'TICKET_ASSIGNED',
    description: `Ticket self-assigned by ${req.user.fullName}`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
    newValue: req.user.fullName,
  });
  await ticket.save();

  // Notify the ticket creator
  await createNotification({
    recipient: ticket.createdBy,
    type:      'TICKET_ASSIGNED',
    title:     'Ticket Assigned',
    message:   `Your ticket ${ticket.ticketId} has been assigned to ${req.user.fullName}.`,
    ticket:    ticket._id,
    ticketId:  ticket.ticketId,
    io:        req.io,
  });

  await logActivity(req.user._id, 'TICKET_ASSIGNED', `Staff ${req.user.fullName} self-assigned ${ticket.ticketId}`, req, {
    entity: 'Ticket', entityId: ticket._id,
  });

  const populated = await Ticket.findById(ticket._id).populate('createdBy', 'fullName email').populate('assignedTo', 'fullName');
  res.status(200).json({ success: true, message: `Ticket ${ticket.ticketId} assigned to you.`, ticket: populated });
};

/**
 * @desc    Update ticket status (by staff)
 * @route   PATCH /api/staff/tickets/:id/status
 * @access  Private (it_staff)
 */
const updateTicketStatusByStaff = async (req, res) => {
  const { status, reason, resolution, internalNotes } = req.body;

  const allowedStatuses = ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Staff can only set status to: ${allowedStatuses.join(', ')}` });
  }

  const ticket = await findTicketByIdOrIdString(req.params.id);

  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  // Must be assigned to this staff member
  if (ticket.assignedTo?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'You can only update tickets assigned to you.' });
  }

  const oldStatus = ticket.status;
  ticket.status = status;

  if (resolution)    ticket.resolution    = resolution;
  if (internalNotes) ticket.internalNotes = internalNotes;

  if (status === 'RESOLVED') {
    ticket.resolvedAt = new Date();
    ticket.resolutionTime = ticket.resolvedAt - ticket.createdAt;
    ticket.slaBreached = new Date(ticket.resolvedAt) > new Date(ticket.slaDeadline);

    // Update staff stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { ticketsResolved: 1 } });
  }

  ticket.history.push({
    action: 'STATUS_CHANGED',
    description: reason || `Status updated to ${status} by ${req.user.fullName}`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
    oldValue: oldStatus,
    newValue: status,
  });

  await ticket.save();

  // Notify ticket creator
  const notifMessages = {
    IN_PROGRESS:      `Your ticket ${ticket.ticketId} is now being worked on by ${req.user.fullName}.`,
    WAITING_FOR_USER: `Your ticket ${ticket.ticketId} is waiting for your response.`,
    RESOLVED:         `Your ticket ${ticket.ticketId} has been resolved by ${req.user.fullName}. Please close it if satisfied.`,
  };

  await createNotification({
    recipient: ticket.createdBy,
    type:      'STATUS_CHANGED',
    title:     `Ticket ${status === 'RESOLVED' ? 'Resolved' : 'Updated'}: ${ticket.ticketId}`,
    message:   notifMessages[status],
    ticket:    ticket._id,
    ticketId:  ticket.ticketId,
    io:        req.io,
  });

  // Emit real-time update
  if (req.io) {
    req.io.to(`ticket:${ticket._id}`).emit('ticket:statusChanged', { ticketId: ticket.ticketId, status, updatedBy: req.user.fullName });
  }

  await logActivity(req.user._id, 'TICKET_STATUS_CHANGED', `Ticket ${ticket.ticketId} status: ${oldStatus} → ${status}`, req, {
    entity: 'Ticket', entityId: ticket._id,
  });

  const populated = await Ticket.findById(ticket._id)
    .populate('createdBy',  'fullName email')
    .populate('assignedTo', 'fullName email');

  res.status(200).json({
    success: true,
    message: `Ticket status updated to ${status}.`,
    ticket:  populated,
  });
};

/**
 * @desc    Get staff's notification inbox
 * @route   GET /api/staff/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const query = { recipient: req.user._id };
  if (unreadOnly === 'true') query.isRead = false;

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.status(200).json({ success: true, notifications, total, unreadCount, page: pageNum });
};

/**
 * @desc    Mark notifications as read
 * @route   PATCH /api/staff/notifications/read
 * @access  Private
 */
const markNotificationsRead = async (req, res) => {
  const { ids } = req.body; // array of notification IDs, or empty = mark all
  const query = { recipient: req.user._id };
  if (ids?.length) query._id = { $in: ids };

  await Notification.updateMany(query, { $set: { isRead: true } });
  res.status(200).json({ success: true, message: 'Notifications marked as read.' });
};

module.exports = {
  getStaffStats,
  getAssignedTickets,
  getAvailableTickets,
  selfAssignTicket,
  updateTicketStatusByStaff,
  getNotifications,
  markNotificationsRead,
};
