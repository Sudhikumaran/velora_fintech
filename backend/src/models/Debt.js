import mongoose from 'mongoose';

const repaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String, trim: true },
});

const debtSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['borrowed', 'lent'],
      required: [true, 'Debt type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    remainingAmount: {
      type: Number,
    },
    person: {
      type: String,
      required: [true, 'Person name is required'],
      trim: true,
      maxlength: [100, 'Person name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    closedAt: {
      type: Date,
    },
    lastReminderSentAt: {
      type: Date,
    },
    repayments: [repaymentSchema],
    interestRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    isEMI:        { type: Boolean, default: false },
    emiAmount:    { type: Number },
    emiDay:       { type: Number, min: 1, max: 31 },
    emiStartDate: { type: Date },
    tenure:       { type: Number },
  },
  { timestamps: true }
);

debtSchema.pre('save', function () {
  const totalRepaid = this.repayments.reduce((sum, r) => sum + r.amount, 0);
  this.remainingAmount = Math.max(0, this.amount - totalRepaid);
  const wasPaid = this.status === 'paid';
  if (this.remainingAmount === 0) {
    this.status = 'paid';
    if (!wasPaid || !this.closedAt) {
      this.closedAt = new Date();
    }
  } else {
    this.status = totalRepaid > 0 ? 'partial' : 'pending';
    this.closedAt = undefined;
  }
});

const Debt = mongoose.model('Debt', debtSchema);
export default Debt;
