/**
 * Admin Routes – /api/admin/*
 * All endpoints restricted to admin role only.
 */
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAdminStats,
  getAllUsers, getUserById, updateUser, deleteUser,
  getAllTickets, assignTicket, closeTicket,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getCategories, createCategory, updateCategory, deleteCategory,
  getReportsData,
  getActivityLog, getStaffList,
} = require('../controllers/adminController');

const adminOnly = [protect, authorize('admin')];

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats',               ...adminOnly, getAdminStats);

// ─── Users ───────────────────────────────────────────────────────────────────
router.get('/users',               ...adminOnly, getAllUsers);
router.get('/users/:id',           ...adminOnly, getUserById);
router.patch('/users/:id',         ...adminOnly, updateUser);
router.delete('/users/:id',        ...adminOnly, deleteUser);

// ─── Tickets ─────────────────────────────────────────────────────────────────
router.get('/tickets',             ...adminOnly, getAllTickets);
router.patch('/tickets/:id/assign',...adminOnly, assignTicket);
router.patch('/tickets/:id/close', ...adminOnly, closeTicket);

// ─── Departments ──────────────────────────────────────────────────────────────
router.get('/departments',         ...adminOnly, getDepartments);
router.post('/departments',        ...adminOnly, createDepartment);
router.patch('/departments/:id',   ...adminOnly, updateDepartment);
router.delete('/departments/:id',  ...adminOnly, deleteDepartment);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories',          ...adminOnly, getCategories);
router.post('/categories',         ...adminOnly, createCategory);
router.patch('/categories/:id',    ...adminOnly, updateCategory);
router.delete('/categories/:id',   ...adminOnly, deleteCategory);

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports',             ...adminOnly, getReportsData);

// ─── Activity Log ─────────────────────────────────────────────────────────────
router.get('/activity',            ...adminOnly, getActivityLog);

// ─── Staff List (for assignment dropdown) ────────────────────────────────────
router.get('/staff-list',          ...adminOnly, getStaffList);

module.exports = router;
