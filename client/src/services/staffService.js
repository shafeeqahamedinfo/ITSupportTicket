/**
 * staffService.js – API calls for IT Support Staff
 * All routes hit /api/staff/*
 */
import api from './api';

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const getStaffStats = () =>
  api.get('/staff/stats').then(r => r.data);

// ─── Assigned Tickets ─────────────────────────────────────────────────────────
export const getAssignedTickets = (params = {}) =>
  api.get('/staff/tickets/assigned', { params }).then(r => r.data);

// ─── Available Tickets ────────────────────────────────────────────────────────
export const getAvailableTickets = (params = {}) =>
  api.get('/staff/tickets/available', { params }).then(r => r.data);

// ─── Self-Assign ──────────────────────────────────────────────────────────────
export const selfAssignTicket = (id) =>
  api.post(`/staff/tickets/${id}/assign-self`).then(r => r.data);

// ─── Update Status ────────────────────────────────────────────────────────────
export const updateTicketStatus = (id, body) =>
  api.patch(`/staff/tickets/${id}/status`, body).then(r => r.data);

// ─── Comments ─────────────────────────────────────────────────────────────────
export const getTicketComments = (id) =>
  api.get(`/staff/tickets/${id}/comments`).then(r => r.data);

export const addTicketComment = (id, body) =>
  api.post(`/staff/tickets/${id}/comments`, body).then(r => r.data);

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = (params = {}) =>
  api.get('/notifications', { params }).then(r => r.data);

export const markNotificationsRead = (ids = []) =>
  api.patch('/notifications/read', { ids }).then(r => r.data);
