import mongoose from 'mongoose';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
    color: { type: String, default: '#0d9488' },
    description: { type: String, default: '' },
    /** Local wall-clock time (HH:mm) to send the reminder email on the event date. */
    notifyTime: {
      type: String,
      default: '09:00',
      validate: {
        validator: (v) => !v || HHMM.test(v),
        message: 'notifyTime must be HH:mm (24h)',
      },
    },
    /** When false, skip timed reminder email (create confirmation still attempted). */
    sendEmailReminder: { type: Boolean, default: true },
    /** YMD (user timezone) when the timed reminder was last sent — prevents duplicates. */
    lastReminderSentYmd: { type: String, default: null },
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
