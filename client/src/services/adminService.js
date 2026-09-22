/**
 * adminService.js – API calls for Admin Panel
 * All routes hit /api/admin/*
 */
import api from './api';

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const getAdminStats = () =>
  api.get('/admin/stats').then(r => r.data);

// ─── User Management ─────────────────────────────────────────────────────────
export const getAllUsers = (params = {}) =>
  api.get('/admin/users', { params }).then(r => r.data);

export const getUserById = (id) =>
  api.get(`/admin/users/${id}`).then(r => r.data);

export const updateUser = (id, body) =>
  api.patch(`/admin/users/${id}`, body).then(r => r.data);

export const deleteUser = (id) =>
  api.delete(`/admin/users/${id}`).then(r => r.data);

// ─── Ticket Management ────────────────────────────────────────────────────────
export const getAllTickets = (params = {}) =>
  api.get('/admin/tickets', { params }).then(r => r.data);

export const assignTicket = (id, staffId) =>
  api.patch(`/admin/tickets/${id}/assign`, { staffId }).then(r => r.data);

export const closeTicket = (id, resolution) =>
  api.patch(`/admin/tickets/${id}/close`, { resolution }).then(r => r.data);

// ─── Departments ──────────────────────────────────────────────────────────────
export const getDepartments = () =>
  api.get('/admin/departments').then(r => r.data);

export const createDepartment = (body) =>
  api.post('/admin/departments', body).then(r => r.data);

export const updateDepartment = (id, body) =>
  api.patch(`/admin/departments/${id}`, body).then(r => r.data);

export const deleteDepartment = (id) =>
  api.delete(`/admin/departments/${id}`).then(r => r.data);

// ─── Categories ───────────────────────────────────────────────────────────────
export const getCategories = () =>
  api.get('/admin/categories').then(r => r.data);

export const createCategory = (body) =>
  api.post('/admin/categories', body).then(r => r.data);

export const updateCategory = (id, body) =>
  api.patch(`/admin/categories/${id}`, body).then(r => r.data);

export const deleteCategory = (id) =>
  api.delete(`/admin/categories/${id}`).then(r => r.data);

// ─── Reports & Analytics ──────────────────────────────────────────────────────
export const getReportsData = () =>
  api.get('/admin/reports').then(r => r.data);

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const getActivityLog = (params = {}) =>
  api.get('/admin/activity', { params }).then(r => r.data);

// ─── Staff List ───────────────────────────────────────────────────────────────
export const getStaffList = () =>
  api.get('/admin/staff-list').then(r => r.data);
