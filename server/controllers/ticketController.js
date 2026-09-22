const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const { calculateSmartPriority, calculateSLADeadline } = require('../services/priorityService');
const { generateTicketId } = require('../utils/ticketIdGenerator');
const ActivityLog = require('../models/ActivityLog');
const path = require('path');

// ─── Helper: Find Ticket by ObjectId or TicketId String ─────────────────────
const findTicketByIdOrIdString = (id) => {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { ticketId: id }] }
    : { ticketId: id };
  return Ticket.findOne(query);
};

// ─── Helper: Log Activity ─────────────────────────────────────────────────────
const logActivity = async (userId, action, description, req, extra = {}) => {
  try {
    await ActivityLog.create({
      user: userId, action, description,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      ...extra,
    });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

/**
 * @desc    Create a new ticket
 * @route   POST /api/tickets
 * @access  Private (User, IT Staff)
 */
const createTicket = async (req, res) => {
  const {
    title, description, category, department,
    building, room, floor, locationDetails,
    userPriority, affectedUsers, urgency, serviceImpact,
    tags,
  } = req.body;

  // Generate unique ticket ID
  const ticketId = await generateTicketId();

  // Smart priority calculation
  const { priority, score, reason } = calculateSmartPriority({
    category,
    affectedUsers: parseInt(affectedUsers) || 1,
    urgency: urgency || 'MEDIUM',
    serviceImpact: serviceImpact || 'MINOR',
    userPriority: userPriority || 'MEDIUM',
  });

  // SLA deadline
  const slaDeadline = calculateSLADeadline(priority);

  // Process uploaded attachments (if any)
  const attachments = (req.files || []).map((file) => ({
    filename:     file.filename,
    originalName: file.originalname,
    mimetype:     file.mimetype,
    size:         file.size,
    path:         file.path,
  }));

  const ticket = await Ticket.create({
    ticketId,
    title,
    description,
    category,
    department,
    location: { building, room, floor, details: locationDetails },
    userPriority: userPriority || 'MEDIUM',
    priority,
    affectedUsers: parseInt(affectedUsers) || 1,
    urgency: urgency || 'MEDIUM',
    serviceImpact: serviceImpact || 'MINOR',
    createdBy: req.user._id,
    attachments,
    slaDeadline,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
    history: [
      {
        action: 'CREATED',
        description: `Ticket created by ${req.user.fullName}`,
        performedBy: req.user._id,
        performedByName: req.user.fullName,
      },
    ],
  });

  await logActivity(req.user._id, 'TICKET_CREATED', `Ticket ${ticketId} created: ${title}`, req, {
    entity: 'Ticket', entityId: ticket._id,
    metadata: { priority, score, reason, slaDeadline },
  });

  // Emit socket event for real-time notifications (Phase 7)
  if (req.io) {
    req.io.to('adminRoom').emit('ticket:new', {
      ticketId: ticket.ticketId,
      title: ticket.title,
      priority: ticket.priority,
      createdBy: req.user.fullName,
    });
  }

  const populated = await Ticket.findById(ticket._id).populate('createdBy', 'fullName email');

  res.status(201).json({
    success: true,
    message: `Ticket ${ticketId} created successfully.`,
    ticket: populated,
    priorityInfo: { priority, score, reason },
  });
};

/**
 * @desc    Get tickets for current user (my tickets)
 * @route   GET /api/tickets/my
 * @access  Private
 */
const getMyTickets = async (req, res) => {
  const {
    status, priority, category, search,
    page = 1, limit = 10, sort = '-createdAt',
  } = req.query;

  const query = { createdBy: req.user._id };

  if (status)   query.status   = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { title:    { $regex: search, $options: 'i' } },
      { ticketId: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const skip     = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('assignedTo', 'fullName email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Ticket.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    tickets,
    pagination: {
      total,
      page:       pageNum,
      limit:      limitNum,
      totalPages: Math.ceil(total / limitNum),
      hasMore:    pageNum < Math.ceil(total / limitNum),
    },
  });
};

/**
 * @desc    Get single ticket by ID
 * @route   GET /api/tickets/:id
 * @access  Private
 */
const getTicketById = async (req, res) => {
  const ticket = await findTicketByIdOrIdString(req.params.id)
    .populate('createdBy',  'fullName email userType departmentName')
    .populate('assignedTo', 'fullName email phone');

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found.' });
  }

  // Users can only see their own tickets; staff/admin see all
  if (
    req.user.role === 'user' &&
    ticket.createdBy._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  res.status(200).json({ success: true, ticket });
};

/**
 * @desc    Get user dashboard stats
 * @route   GET /api/tickets/stats/my
 * @access  Private
 */
const getMyStats = async (req, res) => {
  const userId = req.user._id;

  const [statusCounts, priorityCounts, recentTickets, monthlyCounts] = await Promise.all([
    // Tickets by status
    Ticket.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Tickets by priority
    Ticket.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),

    // 5 most recent tickets
    Ticket.find({ createdBy: userId })
      .sort('-createdAt')
      .limit(5)
      .populate('assignedTo', 'fullName')
      .select('ticketId title status priority category createdAt slaDeadline'),

    // Monthly ticket trend (last 6 months)
    Ticket.aggregate([
      {
        $match: {
          createdBy: userId,
          createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 3600000) },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  // Normalize status counts into a map
  const statusMap = { NEW: 0, ASSIGNED: 0, IN_PROGRESS: 0, WAITING_FOR_USER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0 };
  statusCounts.forEach(({ _id, count }) => { statusMap[_id] = count; });

  const total    = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const open     = statusMap.NEW + statusMap.REOPENED;
  const inProg   = statusMap.IN_PROGRESS + statusMap.ASSIGNED + statusMap.WAITING_FOR_USER;
  const resolved = statusMap.RESOLVED + statusMap.CLOSED;

  // Normalize priority counts
  const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  priorityCounts.forEach(({ _id, count }) => { priorityMap[_id] = count; });

  // Format monthly trend
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyTrend = monthlyCounts.map(({ _id, count }) => ({
    month: `${MONTHS[_id.month - 1]} ${_id.year}`,
    tickets: count,
  }));

  res.status(200).json({
    success: true,
    stats: {
      total,
      open,
      inProgress: inProg,
      resolved,
      byStatus:   statusMap,
      byPriority: priorityMap,
      recentTickets,
      monthlyTrend,
    },
  });
};

/**
 * @desc    Update ticket status (user can only reopen/close if resolved)
 * @route   PATCH /api/tickets/:id/status
 * @access  Private
 */
const updateTicketStatus = async (req, res) => {
  const { status, reason } = req.body;
  const ticket = await findTicketByIdOrIdString(req.params.id);

  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  // Role restrictions
  const userOnly = ['CLOSED'];
  const staffOnly = ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'];

  if (req.user.role === 'user') {
    if (status === 'REOPENED' && ticket.status !== 'RESOLVED') {
      return res.status(400).json({ success: false, message: 'You can only reopen a resolved ticket.' });
    }
    if (!['CLOSED', 'REOPENED'].includes(status)) {
      return res.status(403).json({ success: false, message: 'You cannot set this status.' });
    }
  }

  const oldStatus = ticket.status;
  ticket.status = status;
  ticket.history.push({
    action: 'STATUS_CHANGED',
    description: reason || `Status changed to ${status}`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
    oldValue: oldStatus,
    newValue: status,
  });

  if (status === 'RESOLVED') {
    ticket.resolvedAt = new Date();
    ticket.resolutionTime = ticket.resolvedAt - ticket.createdAt;
    ticket.slaBreached = new Date(ticket.resolvedAt) > new Date(ticket.slaDeadline);
  }
  if (status === 'REOPENED') ticket.reopenCount += 1;
  if (status === 'CLOSED')   ticket.closedAt = new Date();

  await ticket.save();

  // Emit real-time update
  if (req.io) {
    req.io.to(ticket.createdBy.toString()).emit('ticket:statusChanged', {
      ticketId: ticket.ticketId, status,
    });
  }

  res.status(200).json({
    success: true,
    message: `Ticket status updated to ${status}.`,
    ticket,
  });
};

/**
 * @desc    Add comment / chat message to ticket
 * @route   POST /api/tickets/:id/comments
 * @access  Private
 */
const addComment = async (req, res) => {
  const { message, isInternal } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message content is required.' });
  }

  const ticket = await findTicketByIdOrIdString(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  const commentText = message.trim();
  const internal = req.user.role !== 'user' ? !!isInternal : false;

  const commentObj = {
    sender: req.user._id,
    senderName: req.user.fullName,
    senderRole: req.user.role,
    message: commentText,
    isInternal: internal,
    createdAt: new Date(),
  };

  try {
    await Comment.create({
      ticket: ticket._id,
      author: req.user._id,
      authorName: req.user.fullName,
      authorRole: req.user.role,
      content: commentText,
      isInternal: internal,
    });
  } catch (e) {
    console.error('Failed to create standalone Comment record:', e.message);
  }

  ticket.comments.push(commentObj);
  ticket.history.push({
    action: 'COMMENT_ADDED',
    description: internal ? `Internal note added by ${req.user.fullName}` : `Comment added by ${req.user.fullName}`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
  });

  await ticket.save();

  if (req.io) {
    req.io.emit(`ticket:${ticket.ticketId}:comment`, commentObj);
    req.io.to(`ticket:${ticket._id}`).emit('comment:new', {
      _id: commentObj._id,
      ticket: ticket._id,
      author: { _id: req.user._id, fullName: req.user.fullName, role: req.user.role },
      authorName: req.user.fullName,
      authorRole: req.user.role,
      content: commentText,
      isInternal: internal,
      createdAt: commentObj.createdAt,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Comment added successfully.',
    comment: commentObj,
    comments: ticket.comments,
  });
};


/**
 * @desc    Submit CSAT Feedback & Star Rating
 * @route   POST /api/tickets/:id/feedback
 * @access  Private (User)
 */
const submitFeedback = async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
  }

  const ticket = await findTicketByIdOrIdString(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  ticket.feedback = {
    rating: Number(rating),
    comment: comment ? comment.trim() : '',
    givenAt: new Date(),
  };

  ticket.history.push({
    action: 'FEEDBACK_SUBMITTED',
    description: `Submitted ${rating}-star feedback rating`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
  });

  await ticket.save();

  res.status(200).json({
    success: true,
    message: 'Thank you for your feedback!',
    feedback: ticket.feedback,
  });
};

/**
 * @desc    Export tickets to CSV
 * @route   GET /api/tickets/export/csv
 * @access  Private
 */
const exportTicketsCSV = async (req, res) => {
  let query = {};
  if (req.user.role === 'user') {
    query.createdBy = req.user._id;
  }
  const tickets = await Ticket.find(query)
    .sort('-createdAt')
    .populate('createdBy', 'fullName email')
    .populate('assignedTo', 'fullName email');

  let csv = 'Ticket ID,Title,Category,Priority,Status,SLA Breached,Created By,Assigned To,Created At\n';
  tickets.forEach((t) => {
    const title = `"${(t.title || '').replace(/"/g, '""')}"`;
    const createdBy = `"${(t.createdBy?.fullName || '').replace(/"/g, '""')}"`;
    const assignedTo = `"${(t.assignedTo?.fullName || 'Unassigned').replace(/"/g, '""')}"`;
    const createdAt = new Date(t.createdAt).toISOString();
    csv += `${t.ticketId},${title},${t.category},${t.priority},${t.status},${t.slaBreached},${createdBy},${assignedTo},${createdAt}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="SmartCampus_Tickets_Export.csv"');
  res.status(200).send(csv);
};

/**
 * @desc    Get AI Suggested Solution & KB Article Recommendations
 * @route   GET /api/tickets/:id/ai-solution
 * @access  Private (Staff/Admin)
 */
const getAISuggestedSolution = async (req, res) => {
  const KnowledgeArticle = require('../models/KnowledgeArticle');
  const ticket = await findTicketByIdOrIdString(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  const articles = await KnowledgeArticle.find({
    $or: [
      { category: ticket.category },
      { tags: { $in: [ticket.category.toLowerCase(), ...(ticket.tags || [])] } },
    ],
  }).limit(3);

  const templates = {
    'Wi-Fi': '1. Forget network "Campus-WiFi" on device.\n2. Re-authenticate using LDAP credentials.\n3. Check MAC address registration on IT Portal.',
    Software: '1. Check software license activation status.\n2. Run software as administrator.\n3. Verify compatibility with OS build.',
    Hardware: '1. Run hardware diagnostics test.\n2. Verify cable connections and power supply.\n3. Dispatch IT field technician for component replacement.',
    Network: '1. Flush DNS cache using ipconfig /flushdns.\n2. Verify Gateway IP ping responsiveness.\n3. Check port status on switch.',
    Printer: '1. Clear print spooler queue.\n2. Verify IP address connectivity on campus subnet.\n3. Check paper tray and toner levels.',
  };

  const suggestedSteps = templates[ticket.category] || '1. Verify issue reproducibility with user.\n2. Check system event logs.\n3. Escalate to tier-2 specialist if unresolved.';

  res.status(200).json({
    success: true,
    aiRecommendation: {
      category: ticket.category,
      confidenceScore: '94%',
      suggestedResolution: suggestedSteps,
      relatedArticles: articles.map(a => ({ id: a._id, title: a.title, category: a.category, views: a.views })),
    },
  });
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  getMyStats,
  updateTicketStatus,
  addComment,
  submitFeedback,
  exportTicketsCSV,
  getAISuggestedSolution,
};
