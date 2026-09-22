const mongoose = require('mongoose');

/**
 * Category Schema
 * Used in ticket creation and filtering
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: { type: String, trim: true },
    icon:        { type: String, default: '🔧' },
    // Base priority weight used in smart priority calc
    priorityWeight: { type: Number, default: 1, min: 1, max: 5 },
    isActive: { type: Boolean, default: true },
    order:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ isActive: 1 });
categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
