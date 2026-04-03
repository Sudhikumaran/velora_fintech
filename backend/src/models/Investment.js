import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Investment name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: ['stock', 'crypto', 'real-estate', 'mutual-fund', 'etf', 'bond', 'commodity', 'digi-gold', 'other'],
      required: [true, 'Investment type is required'],
    },
    symbol: {
      type: String,
      trim: true,
      uppercase: true,
    },
    units: {
      type: Number,
      required: [true, 'Units are required'],
      min: [0, 'Units cannot be negative'],
    },
    buyPrice: {
      type: Number,
      required: [true, 'Buy price is required'],
      min: [0, 'Buy price cannot be negative'],
    },
    currentPrice: {
      type: Number,
      min: [0, 'Current price cannot be negative'],
    },
    buyDate: {
      type: Date,
      default: Date.now,
    },
    platform: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    currency: {
      type: String,
      default: 'USD',
    },
    priceHistory: [
      {
        price: { type: Number, required: true },
        date:  { type: Date, default: Date.now },
        note:  { type: String, default: '' },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

investmentSchema.virtual('totalInvested').get(function () {
  return this.units * this.buyPrice;
});

investmentSchema.virtual('currentValue').get(function () {
  return this.units * (this.currentPrice || this.buyPrice);
});

investmentSchema.virtual('gainLoss').get(function () {
  return this.currentValue - this.totalInvested;
});

investmentSchema.virtual('gainLossPercent').get(function () {
  if (this.totalInvested === 0) return 0;
  return ((this.gainLoss / this.totalInvested) * 100).toFixed(2);
});

const Investment = mongoose.model('Investment', investmentSchema);
export default Investment;
