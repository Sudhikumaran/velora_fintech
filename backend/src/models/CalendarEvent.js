import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['bill', 'reminder', 'goal', 'income', 'note'],
      default: 'reminder',
    },
    amount: { type: Number, default: null },
    color: { type: String, default: '#6366f1' },
    description: { type: String, default: '' },
    isRecurring: { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', null],
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('CalendarEvent', calendarEventSchema);
