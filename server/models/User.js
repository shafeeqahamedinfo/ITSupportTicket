const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Covers all three roles: user (student/faculty/staff), it_staff, admin
 */
const userSchema = new mongoose.Schema(
  {
    // ── Basic Info ──────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },

    // ── Role & Type ─────────────────────────────────────────
    role: {
      type: String,
      enum: ['user', 'it_staff', 'admin'],
      default: 'user',
    },
    userType: {
      type: String,
      enum: ['student', 'faculty', 'staff', 'it_support', 'administrator'],
      default: 'student',
    },

    // ── Contact & Identification ────────────────────────────
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{7,15}$/, 'Please enter a valid phone number'],
    },
    employeeId: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple nulls (only unique among non-null)
    },

    // ── Department ──────────────────────────────────────────
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    departmentName: {
      type: String,
      trim: true,
    },

    // ── Profile ─────────────────────────────────────────────
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio cannot exceed 300 characters'],
    },

    // ── Account Status ──────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ── Password Reset ──────────────────────────────────────
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ── IT Staff Specific ───────────────────────────────────
    specialization: {
      type: [String],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // ── Stats (updated via aggregation, cached here) ────────
    ticketsResolved: { type: Number, default: 0 },
    averageRating:   { type: Number, default: 0 },

    // ── Last Login ──────────────────────────────────────────
    lastLogin: { type: Date },
    lastLoginIP: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isActive: 1 });

// ── Virtual: initials ──────────────────────────────────────────────────────────
userSchema.virtual('initials').get(function () {
  return this.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

// ── Pre-save: Hash password ────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Method: Compare password ───────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Method: Get public profile (no sensitive fields) ──────────────────────────
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
