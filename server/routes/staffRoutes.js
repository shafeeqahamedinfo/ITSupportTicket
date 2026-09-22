/**
 * Staff Routes – /api/staff/*
 * IT Support Staff: dashboard stats, assigned tickets,
 * available tickets, self-assign, status updates, notifications.
 */
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getStaffStats,
  getAssignedTickets,
  getAvailableTickets,
  selfAssignTicket,
  updateTicketStatusByStaff,
  getNotifications,
  markNotificationsRead,
} = require('../controllers/staffController');
const {
  getComments,
  addComment,
} = require('../controllers/commentController');

// All staff routes require authentication + it_staff (or admin) role
const staffOnly = [protect, authorize('it_staff', 'admin')];
const allAuth   = [protect]; // notifications are for all roles

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats',                       ...staffOnly, getStaffStats);

// ─── Assigned Tickets ─────────────────────────────────────────────────────────
router.get('/tickets/assigned',            ...staffOnly, getAssignedTickets);

// ─── Available (Unassigned) Tickets ──────────────────────────────────────────
router.get('/tickets/available',           ...staffOnly, getAvailableTickets);

// ─── Self-Assign ──────────────────────────────────────────────────────────────
router.post('/tickets/:id/assign-self',    ...staffOnly, selfAssignTicket);

// ─── Status Update (Staff) ────────────────────────────────────────────────────
router.patch('/tickets/:id/status',        ...staffOnly, updateTicketStatusByStaff);

// ─── Comments on Tickets (Staff view) ────────────────────────────────────────
router.get('/tickets/:id/comments',        ...staffOnly, getComments);
router.post('/tickets/:id/comments',       ...staffOnly, addComment);

// ─── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications',              ...allAuth, getNotifications);
router.patch('/notifications/read',       ...allAuth, markNotificationsRead);

module.exports = router;
