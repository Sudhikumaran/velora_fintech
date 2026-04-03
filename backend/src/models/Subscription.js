import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Subscription name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
      required: [true, 'Frequency is required'],
      default: 'monthly',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
    },
    nextBillingDate: {
      type: Date,
      required: [true, 'Next billing date is required'],
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
      default: 'active',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    website: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    remindBefore: {
      type: Number,
      default: 3,
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },
  { timestamps: true }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
