const mongoose = require('mongoose');

/**
 * Department Schema – enriched version for SmartCampus ITCare
 */
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, trim: true },
    headName:    { type: String, trim: true },   // HOD name
    location:    { type: String, trim: true },   // Building/Room
    phone:       { type: String, trim: true },   // Contact phone
    email:       { type: String, trim: true },   // Dept email
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-generate code from name if not provided
departmentSchema.pre('save', function (next) {
  if (!this.code && this.name) {
    // e.g. "Computer Science" → "CS"
    this.code = this.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 6);
  }
  next();
});

departmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Department', departmentSchema);
