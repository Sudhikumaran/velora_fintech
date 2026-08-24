import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['received', 'give'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    postedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  { timestamps: true }
);

const incomePlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Plan title is required'],
      trim: true,
      maxlength: [80, 'Title cannot exceed 80 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    entries: [entrySchema],
  },
  { timestamps: true }
);

incomePlanSchema.index({ user: 1, updatedAt: -1 });

const IncomePlan = mongoose.model('IncomePlan', incomePlanSchema);
export default IncomePlan;
