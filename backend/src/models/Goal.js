import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [0.01, 'Target amount must be greater than 0'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
    deadline: {
      type: Date,
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'paused'],
      default: 'active',
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    icon: {
      type: String,
      default: 'target',
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    contributions: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        note: { type: String, trim: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

goalSchema.virtual('progressPercent').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, ((this.currentAmount / this.targetAmount) * 100).toFixed(1));
});

goalSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

const Goal = mongoose.model('Goal', goalSchema);
export default Goal;
