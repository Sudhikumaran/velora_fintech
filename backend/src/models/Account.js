import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [50, 'Account name cannot exceed 50 characters'],
    },
    type: {
      type: String,
      enum: ['bank', 'cash', 'credit', 'savings', 'investment', 'wallet', 'other'],
      required: [true, 'Account type is required'],
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    icon: {
      type: String,
      default: 'wallet',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    creditLimit: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Account = mongoose.model('Account', accountSchema);
export default Account;
