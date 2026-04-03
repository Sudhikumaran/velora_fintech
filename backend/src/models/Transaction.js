import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    tags: [{ type: String, trim: true }],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    receiptUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, category: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
