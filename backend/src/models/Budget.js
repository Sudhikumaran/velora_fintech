import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Budget name is required'],
      trim: true,
      maxlength: [50, 'Budget name cannot exceed 50 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    limit: {
      type: Number,
      required: [true, 'Budget limit is required'],
      min: [0.01, 'Limit must be greater than 0'],
    },
    spent: {
      type: Number,
      default: 0,
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rollover: {
      type: Boolean,
      default: false,
    },
    notifications: {
      type: Boolean,
      default: true,
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

const Budget = mongoose.model('Budget', budgetSchema);
export default Budget;
