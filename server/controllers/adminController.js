/**
 * adminController.js
 * Admin-only endpoints: system stats, user management, ticket assignment,
 * department management, activity logs, SLA overview.
 */
const User        = require('../models/User');
const Ticket      = require('../models/Ticket');
const Department  = require('../models/Department');
const Category    = require('../models/Category');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { createNotification } = require('../services/notificationService');
const { findTicketByIdOrIdString } = require('../utils/ticketLookup');

// ─── Helper ───────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    System-wide analytics for admin dashboard
 * @route   GET /api/admin/stats
 * @access  Private (admin)
 */
const getAdminStats = async (req, res) => {
  const now     = new Date();
  const today   = new Date(now.setHours(0, 0, 0, 0));
  const week    = new Date(Date.now() - 7  * 24 * 3600000);
  const month   = new Date(Date.now() - 30 * 24 * 3600000);

  const [
    totalTickets, openTickets, resolvedToday, slaBreached,
    totalUsers, activeStaff, ticketsByStatus, ticketsByPriority,
    ticketsByCategory, monthlyTrend, staffPerformance,
    recentTickets, pendingUserCount, totalDepts,
  ] = await Promise.all([

    Ticket.countDocuments({}),
    Ticket.countDocuments({ status: { $nin: ['RESOLVED', 'CLOSED'] } }),
    Ticket.countDocuments({ status: { $in: ['RESOLVED','CLOSED'] }, resolvedAt: { $gte: today } }),
    Ticket.countDocuments({ slaBreached: true, status: { $nin: ['CLOSED'] } }),

    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: 'it_staff', isActive: true }),

    // By status
    Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // By priority
    Ticket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),

    // By category (top 8)
    Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),

    // Monthly trend last 6 months
    Ticket.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 3600000) } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        created: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', ['RESOLVED','CLOSED']] }, 1, 0] } },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // Staff performance (top 10 by resolved)
    Ticket.aggregate([
      { $match: { assignedTo: { $ne: null }, status: { $in: ['RESOLVED','CLOSED'] } } },
      { $group: {
        _id: '$assignedTo',
        resolved: { $sum: 1 },
        avgResolutionTime: { $avg: '$resolutionTime' },
        slaBreached: { $sum: { $cond: ['$slaBreached', 1, 0] } },
      }},
      { $sort: { resolved: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staffInfo' } },
      { $unwind: '$staffInfo' },
      { $project: {
        name: '$staffInfo.fullName',
        email: '$staffInfo.email',
        resolved: 1,
        avgResolutionHrs: { $divide: ['$avgResolutionTime', 3600000] },
        slaBreached: 1,
      }},
    ]),

    // Recent 10 tickets
    Ticket.find({})
      .sort('-createdAt').limit(10)
      .populate('createdBy', 'fullName')
      .populate('assignedTo', 'fullName')
      .select('ticketId title status priority category slaDeadline slaBreached createdAt'),

    User.countDocuments({ isActive: false }),
    Department.countDocuments({}),
  ]);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const statusMap    = {};
  ticketsByStatus.forEach(({ _id, count }) => { statusMap[_id] = count; });
  const priorityMap  = {};
  ticketsByPriority.forEach(({ _id, count }) => { priorityMap[_id] = count; });
  const categoryData = ticketsByCategory.map(({ _id, count }) => ({ category: _id, count }));
  const trendData    = monthlyTrend.map(({ _id, created, resolved }) => ({
    month: `${MONTHS[_id.month - 1]} ${_id.year}`,
    created, resolved,
  }));

  res.status(200).json({
    success: true,
    stats: {
      totalTickets, openTickets, resolvedToday, slaBreached,
      totalUsers, activeStaff, pendingUserCount, totalDepts,
      byStatus:    statusMap,
      byPriority:  priorityMap,
      byCategory:  categoryData,
      monthlyTrend: trendData,
      staffPerformance,
      recentTickets,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all users (paginated, searchable, filterable)
 * @route   GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
  const { search, role, isActive, page = 1, limit = 15, sort = '-createdAt' } = req.query;

  const query = {};
  if (role)     query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { fullName:       { $regex: search, $options: 'i' } },
      { email:          { $regex: search, $options: 'i' } },
      { departmentName: { $regex: search, $options: 'i' } },
      { employeeId:     { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true, users,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
};

/**
 * @desc    Get single user details + their ticket history
 * @route   GET /api/admin/users/:id
 */
const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const [ticketCount, resolvedCount, openCount] = await Promise.all([
    Ticket.countDocuments({ $or: [{ createdBy: user._id }, { assignedTo: user._id }] }),
    Ticket.countDocuments({ assignedTo: user._id, status: { $in: ['RESOLVED','CLOSED'] } }),
    Ticket.countDocuments({ assignedTo: user._id, status: { $nin: ['RESOLVED','CLOSED'] } }),
  ]);

  res.status(200).json({ success: true, user, ticketCount, resolvedCount, openCount });
};

/**
 * @desc    Update user role / status / details
 * @route   PATCH /api/admin/users/:id
 */
const updateUser = async (req, res) => {
  const { role, isActive, departmentName, phone } = req.body;

  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  // Prevent self-demotion
  if (req.user._id.toString() === user._id.toString() && role && role !== 'admin') {
    return res.status(400).json({ success: false, message: 'You cannot change your own admin role.' });
  }

  if (role           !== undefined) user.role           = role;
  if (isActive       !== undefined) user.isActive       = isActive;
  if (departmentName !== undefined) user.departmentName = departmentName;
  if (phone          !== undefined) user.phone          = phone;

  await user.save();

  await logActivity(req.user._id, 'USER_UPDATED', `Admin updated user ${user.email} – role:${user.role} active:${user.isActive}`, req, {
    entity: 'User', entityId: user._id,
  });

  res.status(200).json({ success: true, message: 'User updated.', user });
};

/**
 * @desc    Delete (deactivate) a user
 * @route   DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  if (req.user._id.toString() === user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  }

  // Soft delete
  user.isActive = false;
  user.email    = `deleted_${Date.now()}_${user.email}`;
  await user.save();

  await logActivity(req.user._id, 'USER_DELETED', `Admin deactivated user ${user.email}`, req, {
    entity: 'User', entityId: user._id,
  });

  res.status(200).json({ success: true, message: 'User deactivated.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// TICKET MANAGEMENT (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all tickets (admin view, all filters)
 * @route   GET /api/admin/tickets
 */
const getAllTickets = async (req, res) => {
  const {
    status, priority, category, assignedTo, search,
    slaBreached, page = 1, limit = 15, sort = '-createdAt',
  } = req.query;

  const query = {};
  if (status)     query.status   = status;
  if (priority)   query.priority = priority;
  if (category)   query.category = category;
  if (assignedTo) query.assignedTo = assignedTo === 'null' ? null : assignedTo;
  if (slaBreached === 'true') query.slaBreached = true;
  if (search) {
    query.$or = [
      { title:    { $regex: search, $options: 'i' } },
      { ticketId: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('createdBy',  'fullName email departmentName')
      .populate('assignedTo', 'fullName email')
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Ticket.countDocuments(query),
  ]);

  res.status(200).json({
    success: true, tickets,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
};

/**
 * @desc    Assign ticket to staff (admin assigns)
 * @route   PATCH /api/admin/tickets/:id/assign
 */
const assignTicket = async (req, res) => {
  const { staffId } = req.body;

  const ticket = await findTicketByIdOrIdString(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  let staff = null;
  if (staffId) {
    staff = await User.findById(staffId).select('-password');
    if (!staff || !['it_staff','admin'].includes(staff.role)) {
      return res.status(400).json({ success: false, message: 'Invalid staff member.' });
    }
  }

  const oldAssignee = ticket.assignedTo;
  ticket.assignedTo = staffId || null;
  ticket.assignedAt = staffId ? new Date() : null;
  ticket.status = staffId ? 'ASSIGNED' : 'NEW';
  ticket.history.push({
    action: 'TICKET_ASSIGNED',
    description: staffId
      ? `Ticket assigned to ${staff.fullName} by admin ${req.user.fullName}`
      : `Ticket unassigned by admin ${req.user.fullName}`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
    newValue: staff?.fullName || 'Unassigned',
  });
  await ticket.save();

  // Notify new assignee
  if (staffId) {
    await createNotification({
      recipient: staffId,
      type: 'TICKET_ASSIGNED',
      title: `Ticket Assigned: ${ticket.ticketId}`,
      message: `Admin assigned you ticket "${ticket.title}". Priority: ${ticket.priority}`,
      ticket: ticket._id,
      ticketId: ticket.ticketId,
      io: req.io,
    });
  }

  // Notify ticket creator
  if (staffId) {
    await createNotification({
      recipient: ticket.createdBy,
      type: 'TICKET_ASSIGNED',
      title: `Ticket Assigned: ${ticket.ticketId}`,
      message: `Your ticket has been assigned to ${staff.fullName}.`,
      ticket: ticket._id,
      ticketId: ticket.ticketId,
      io: req.io,
    });
  }

  await logActivity(req.user._id, 'TICKET_ASSIGNED', `Admin assigned ${ticket.ticketId} to ${staff?.fullName || 'nobody'}`, req, {
    entity: 'Ticket', entityId: ticket._id,
  });

  const populated = await Ticket.findById(ticket._id)
    .populate('createdBy', 'fullName email')
    .populate('assignedTo', 'fullName email');

  res.status(200).json({ success: true, message: 'Ticket assigned.', ticket: populated });
};

/**
 * @desc    Close or force-resolve a ticket (admin override)
 * @route   PATCH /api/admin/tickets/:id/close
 */
const closeTicket = async (req, res) => {
  const { resolution } = req.body;

  const ticket = await Ticket.findOne({
    $or: [{ _id: req.params.id }, { ticketId: req.params.id }],
  });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  const oldStatus = ticket.status;
  ticket.status = 'CLOSED';
  if (resolution) ticket.resolution = resolution;
  ticket.resolvedAt = new Date();
  ticket.resolutionTime = ticket.resolvedAt - ticket.createdAt;
  ticket.slaBreached = new Date(ticket.resolvedAt) > new Date(ticket.slaDeadline);
  ticket.history.push({
    action: 'STATUS_CHANGED',
    description: `Ticket force-closed by admin ${req.user.fullName}`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
    oldValue: oldStatus,
    newValue: 'CLOSED',
  });
  await ticket.save();

  res.status(200).json({ success: true, message: 'Ticket closed.', ticket });
};

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all departments
 * @route   GET /api/admin/departments
 */
const getDepartments = async (req, res) => {
  const departments = await Department.find({}).sort('name');
  // Enrich with user counts
  const enriched = await Promise.all(
    departments.map(async (d) => {
      const memberCount = await User.countDocuments({ departmentName: d.name });
      const openTickets = await Ticket.countDocuments({
        status: { $nin: ['RESOLVED','CLOSED'] },
      });
      return { ...d.toObject(), memberCount, openTickets };
    })
  );
  res.status(200).json({ success: true, departments: enriched });
};

/**
 * @desc    Create department
 * @route   POST /api/admin/departments
 */
const createDepartment = async (req, res) => {
  const { name, description, headName, location, phone } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });

  const existing = await Department.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
  if (existing) return res.status(400).json({ success: false, message: 'Department already exists.' });

  const dept = await Department.create({ name, description, headName, location, phone });
  res.status(201).json({ success: true, message: 'Department created.', department: dept });
};

/**
 * @desc    Update department
 * @route   PATCH /api/admin/departments/:id
 */
const updateDepartment = async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!dept) return res.status(404).json({ success: false, message: 'Department not found.' });
  res.status(200).json({ success: true, message: 'Department updated.', department: dept });
};

/**
 * @desc    Delete department
 * @route   DELETE /api/admin/departments/:id
 */
const deleteDepartment = async (req, res) => {
  const dept = await Department.findByIdAndDelete(req.params.id);
  if (!dept) return res.status(404).json({ success: false, message: 'Department not found.' });
  res.status(200).json({ success: true, message: 'Department deleted.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get activity logs (admin)
 * @route   GET /api/admin/activity
 */
const getActivityLog = async (req, res) => {
  const { page = 1, limit = 20, action, userId } = req.query;
  const query = {};
  if (action) query.action = action;
  if (userId) query.user   = userId;

  const pageNum  = parseInt(page);
  const limitNum = parseInt(limit);
  const [logs, total] = await Promise.all([
    ActivityLog.find(query)
      .populate('user', 'fullName email role')
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    ActivityLog.countDocuments(query),
  ]);

  res.status(200).json({
    success: true, logs,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
};

/**
 * @desc    Get all IT staff list (for assignment dropdown)
 * @route   GET /api/admin/staff-list
 */
const getStaffList = async (req, res) => {
  const staff = await User.find({ role: { $in: ['it_staff', 'admin'] }, isActive: true })
    .select('fullName email departmentName ticketsResolved averageRating')
    .sort('fullName');

  // Enrich with active ticket counts
  const enriched = await Promise.all(
    staff.map(async (s) => {
      const activeCount = await Ticket.countDocuments({
        assignedTo: s._id,
        status: { $nin: ['RESOLVED','CLOSED'] },
      });
      return { ...s.toObject(), activeTickets: activeCount };
    })
  );

  res.status(200).json({ success: true, staff: enriched });
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get all categories with ticket counts
 * @route   GET /api/admin/categories
 */
const getCategories = async (req, res) => {
  const categories = await Category.find().sort('order name');

  // Enrich with ticket counts
  const enriched = await Promise.all(
    categories.map(async (c) => {
      const ticketCount = await Ticket.countDocuments({ category: c.name });
      return { ...c.toObject(), ticketCount };
    })
  );

  res.status(200).json({ success: true, categories: enriched });
};

/**
 * @desc    Create category
 * @route   POST /api/admin/categories
 */
const createCategory = async (req, res) => {
  const { name, description, icon, priorityWeight } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });

  const existing = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
  if (existing) return res.status(400).json({ success: false, message: 'Category already exists.' });

  const category = await Category.create({ name, description, icon, priorityWeight });
  res.status(201).json({ success: true, message: 'Category created.', category });
};

/**
 * @desc    Update category
 * @route   PATCH /api/admin/categories/:id
 */
const updateCategory = async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  res.status(200).json({ success: true, message: 'Category updated.', category });
};

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 */
const deleteCategory = async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  res.status(200).json({ success: true, message: 'Category deleted.' });
};

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get comprehensive system reports and analytics
 * @route   GET /api/admin/reports
 */
const getReportsData = async (req, res) => {
  const [
    totalTickets,
    resolvedTickets,
    slaBreachedCount,
    departmentBreakdown,
    categoryBreakdown,
    statusBreakdown,
    csatAggregation,
  ] = await Promise.all([
    Ticket.countDocuments({}),
    Ticket.countDocuments({ status: { $in: ['RESOLVED', 'CLOSED'] } }),
    Ticket.countDocuments({ slaBreached: true }),

    // Department Breakdown
    Ticket.aggregate([
      { $group: { _id: '$department', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['RESOLVED','CLOSED']] }, 1, 0] } } } },
      { $sort: { total: -1 } },
    ]),

    // Category Breakdown
    Ticket.aggregate([
      { $group: { _id: '$category', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),

    // Status Breakdown
    Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // CSAT Ratings
    Ticket.aggregate([
      { $match: { 'feedback.rating': { $exists: true, $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: '$feedback.rating' }, totalFeedbacks: { $sum: 1 } } },
    ]),
  ]);

  const slaComplianceRate = totalTickets > 0 ? Math.round(((totalTickets - slaBreachedCount) / totalTickets) * 100) : 100;
  const avgCSAT = csatAggregation[0]?.avgRating ? Number(csatAggregation[0].avgRating.toFixed(1)) : 4.8;

  res.status(200).json({
    success: true,
    reports: {
      summary: {
        totalTickets,
        resolvedTickets,
        slaBreachedCount,
        slaComplianceRate,
        avgCSAT,
      },
      departmentBreakdown: departmentBreakdown.map(d => ({ department: d._id || 'General', total: d.total, resolved: d.resolved })),
      categoryBreakdown: categoryBreakdown.map(c => ({ category: c._id || 'Other', total: c.total })),
      statusBreakdown: statusBreakdown.map(s => ({ status: s._id, count: s.count })),
    },
  });
};

module.exports = {
  getAdminStats,
  getAllUsers, getUserById, updateUser, deleteUser,
  getAllTickets, assignTicket, closeTicket,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getCategories, createCategory, updateCategory, deleteCategory,
  getReportsData,
  getActivityLog, getStaffList,
};
