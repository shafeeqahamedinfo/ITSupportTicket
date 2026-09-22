const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { generateToken } = require('../middleware/authMiddleware');
const { validationResult } = require('express-validator');

// ─── Helper: Log Activity ─────────────────────────────────────────────────────
const logActivity = async (userId, action, description, req, extra = {}) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      description,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      ...extra,
    });
  } catch (err) {
    // Non-critical – log but don't break the request
    console.error('Activity log error:', err.message);
  }
};

// ─── Helper: Send Token Response ──────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id);
  const userObj = user.toPublicJSON ? user.toPublicJSON() : user.toObject();

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: userObj,
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  const {
    fullName,
    email,
    password,
    userType,
    departmentName,
    phone,
    employeeId,
  } = req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
    });
  }

  // Determine role from userType
  // Only admins can create it_staff/admin roles via /api/admin/users
  let role = 'user';
  if (userType === 'it_support') role = 'it_staff';
  // Admin accounts created via seed only

  const user = await User.create({
    fullName,
    email,
    password,
    role,
    userType: userType || 'student',
    phone,
    employeeId,
    departmentName,
  });

  await logActivity(user._id, 'USER_REGISTERED', `New account registered: ${user.email}`, req, {
    entity: 'User',
    entityId: user._id,
  });

  sendTokenResponse(user, 201, res, 'Account created successfully. Welcome to SmartCampus ITCare!');
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Check account status
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been disabled. Please contact the IT administrator.',
    });
  }

  // Compare password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Update last login
  user.lastLogin = new Date();
  user.lastLoginIP = req.ip;
  await user.save({ validateBeforeSave: false });

  await logActivity(user._id, 'USER_LOGIN', `User logged in: ${user.email}`, req, {
    entity: 'User',
    entityId: user._id,
    metadata: { role: user.role },
  });

  sendTokenResponse(user, 200, res, `Welcome back, ${user.fullName}!`);
};

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).populate('department', 'name code');

  res.status(200).json({
    success: true,
    user: user.toPublicJSON ? user.toPublicJSON() : user,
  });
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  const { fullName, phone, departmentName, bio, employeeId } = req.body;

  const updateData = {};
  if (fullName)       updateData.fullName = fullName;
  if (phone)          updateData.phone = phone;
  if (departmentName) updateData.departmentName = departmentName;
  if (bio !== undefined) updateData.bio = bio;
  if (employeeId)     updateData.employeeId = employeeId;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  });

  await logActivity(req.user._id, 'USER_UPDATED', `Profile updated: ${user.email}`, req, {
    entity: 'User',
    entityId: user._id,
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    user: user.toPublicJSON ? user.toPublicJSON() : user,
  });
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect.',
    });
  }

  user.password = newPassword;
  await user.save();

  await logActivity(req.user._id, 'PASSWORD_CHANGED', `Password changed for: ${user.email}`, req, {
    entity: 'User',
    entityId: user._id,
  });

  sendTokenResponse(user, 200, res, 'Password changed successfully.');
};

/**
 * @desc    Forgot password – send reset link (stub for Phase 10)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success to prevent email enumeration
  res.status(200).json({
    success: true,
    message: 'If an account with this email exists, a password reset link has been sent.',
  });

  // TODO Phase 10: Generate reset token, send email via nodemailer
  if (user) {
    console.log(`Password reset requested for: ${user.email}`);
  }
};

/**
 * @desc    Logout (client-side token removal, server-side log)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  await logActivity(req.user._id, 'USER_LOGOUT', `User logged out: ${req.user.email}`, req);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

module.exports = { register, login, getProfile, updateProfile, changePassword, forgotPassword, logout };
