const SLAConfig = require('../models/SLAConfig');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { createNotification } = require('../services/notificationService');
const { findTicketByIdOrIdString } = require('../utils/ticketLookup');

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

// Default SLA targets in hours
const DEFAULT_SLAS = [
  { priority: 'CRITICAL', responseTimeHours: 1,  resolutionTimeHours: 4,  escalateAfterBreachHours: 1, autoEscalateToRole: 'admin', notifyDeptHead: true },
  { priority: 'HIGH',     responseTimeHours: 2,  resolutionTimeHours: 8,  escalateAfterBreachHours: 2, autoEscalateToRole: 'admin', notifyDeptHead: true },
  { priority: 'MEDIUM',   responseTimeHours: 4,  resolutionTimeHours: 24, escalateAfterBreachHours: 4, autoEscalateToRole: 'admin', notifyDeptHead: false },
  { priority: 'LOW',      responseTimeHours: 8,  resolutionTimeHours: 48, escalateAfterBreachHours: 8, autoEscalateToRole: 'admin', notifyDeptHead: false },
];

/**
 * @desc    Get SLA configurations (seeds defaults if empty)
 * @route   GET /api/sla/configs
 * @access  Private (Admin / Staff)
 */
const getSLAConfigs = async (req, res) => {
  let configs = await SLAConfig.find().sort({ priority: 1 });

  if (configs.length === 0) {
    configs = await SLAConfig.insertMany(DEFAULT_SLAS);
  }

  res.status(200).json({ success: true, configs });
};

/**
 * @desc    Update SLA configuration for a priority
 * @route   PUT /api/sla/configs/:priority
 * @access  Private (Admin)
 */
const updateSLAConfig = async (req, res) => {
  const { priority } = req.params;
  const { responseTimeHours, resolutionTimeHours, escalateAfterBreachHours, notifyDeptHead } = req.body;

  let config = await SLAConfig.findOne({ priority: priority.toUpperCase() });

  if (!config) {
    config = new SLAConfig({ priority: priority.toUpperCase() });
  }

  if (responseTimeHours !== undefined) config.responseTimeHours = Number(responseTimeHours);
  if (resolutionTimeHours !== undefined) config.resolutionTimeHours = Number(resolutionTimeHours);
  if (escalateAfterBreachHours !== undefined) config.escalateAfterBreachHours = Number(escalateAfterBreachHours);
  if (notifyDeptHead !== undefined) config.notifyDeptHead = Boolean(notifyDeptHead);

  await config.save();

  if (req.user) {
    await logActivity(
      req.user._id,
      'SLA_CONFIG_UPDATED',
      `Updated SLA policy for ${priority.toUpperCase()}: Res ${config.responseTimeHours}h, Sol ${config.resolutionTimeHours}h`,
      req
    );
  }

  res.status(200).json({ success: true, message: `SLA settings updated for ${priority.toUpperCase()}`, config });
};

/**
 * @desc    Get SLA Performance Metrics & Compliance Analytics
 * @route   GET /api/sla/reports
 * @access  Private (Admin / Staff)
 */
const getSLAReports = async (req, res) => {
  const totalTickets = await Ticket.countDocuments();
  const breachedTicketsCount = await Ticket.countDocuments({ isSlaBreached: true });
  const resolvedTickets = await Ticket.find({ status: { $in: ['RESOLVED', 'CLOSED'] } });

  // Calculate SLA Compliance Rate %
  const compliantCount = totalTickets - breachedTicketsCount;
  const complianceRate = totalTickets > 0 ? ((compliantCount / totalTickets) * 100).toFixed(1) : 100;

  // Calculate Average Resolution Time (in hours)
  let totalResolutionHours = 0;
  let resolvedWithTimesCount = 0;

  resolvedTickets.forEach((t) => {
    if (t.resolvedAt && t.createdAt) {
      const hours = (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
      totalResolutionHours += hours;
      resolvedWithTimesCount++;
    }
  });

  const avgResolutionHours = resolvedWithTimesCount > 0 ? (totalResolutionHours / resolvedWithTimesCount).toFixed(1) : 0;

  // Breakdown by Priority
  const priorityBreakdown = await Ticket.aggregate([
    {
      $group: {
        _id: '$priority',
        total: { $sum: 1 },
        breached: { $sum: { $cond: [{ $eq: ['$isSlaBreached', true] }, 1, 0] } },
      },
    },
  ]);

  // Breakdown by Department
  const deptBreakdown = await Ticket.aggregate([
    {
      $group: {
        _id: '$department',
        total: { $sum: 1 },
        breached: { $sum: { $cond: [{ $eq: ['$isSlaBreached', true] }, 1, 0] } },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    metrics: {
      totalTickets,
      breachedTicketsCount,
      compliantTicketsCount: compliantCount,
      complianceRate: Number(complianceRate),
      avgResolutionHours: Number(avgResolutionHours),
      priorityBreakdown,
      deptBreakdown,
    },
  });
};

/**
 * @desc    Get Breached or Near-Breach Tickets
 * @route   GET /api/sla/breached
 * @access  Private (Admin / Staff)
 */
const getBreachedTickets = async (req, res) => {
  const now = new Date();
  const warningWindow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  const breachedTickets = await Ticket.find({
    status: { $nin: ['RESOLVED', 'CLOSED'] },
    $or: [
      { isSlaBreached: true },
      { slaDueDate: { $lte: warningWindow } },
    ],
  })
    .populate('createdBy', 'fullName email')
    .populate('assignedTo', 'fullName email')
    .populate('department', 'name code')
    .sort({ slaDueDate: 1 });

  res.status(200).json({ success: true, count: breachedTickets.length, tickets: breachedTickets });
};

/**
 * @desc    Force Escalate Ticket
 * @route   PATCH /api/sla/escalate/:id
 * @access  Private (Admin / Staff)
 */
const escalateTicket = async (req, res) => {
  const ticket = await findTicketByIdOrIdString(req.params.id);
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found.' });
  }

  ticket.isEscalated = true;
  ticket.priority = 'CRITICAL'; // Upgrade priority on escalation
  ticket.history.push({
    action: 'SLA_BREACH',
    description: `Ticket force-escalated to CRITICAL priority by ${req.user.fullName}. Reason: ${req.body.reason || 'Manual escalation'}`,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
  });

  await ticket.save();

  // Notify creator and assigned staff
  if (ticket.assignedTo) {
    await createNotification({
      recipient: ticket.assignedTo,
      type: 'SLA_BREACH',
      title: `🚨 TICKET ESCALATED: ${ticket.ticketId}`,
      message: `Ticket ${ticket.ticketId} has been escalated to CRITICAL priority!`,
      ticket: ticket._id,
      ticketId: ticket.ticketId,
      io: req.io,
    });
  }

  await logActivity(req.user._id, 'SLA_BREACH', `Ticket ${ticket.ticketId} escalated to CRITICAL`, req, {
    entity: 'Ticket',
    entityId: ticket._id,
  });

  res.status(200).json({ success: true, message: `Ticket ${ticket.ticketId} escalated successfully.`, ticket });
};

module.exports = {
  getSLAConfigs,
  updateSLAConfig,
  getSLAReports,
  getBreachedTickets,
  escalateTicket,
};
