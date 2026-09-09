import CalendarEvent from '../models/CalendarEvent.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sendCalendarEventCreated } from '../services/emailService.js';

const EDITABLE_FIELDS = [
  'title',
  'date',
  'type',
  'amount',
  'color',
  'description',
  'notifyTime',
  'sendEmailReminder',
  'isRecurring',
  'recurringFrequency',
];

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeNotifyTime(value) {
  if (value == null || value === '') return '09:00';
  const raw = String(value).trim();
  // Browsers sometimes send HH:mm:ss
  const withSeconds = raw.match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);
  if (withSeconds) {
    const hh = String(Number(withSeconds[1])).padStart(2, '0');
    return `${hh}:${withSeconds[2]}`;
  }
  if (HHMM.test(raw)) return raw;
  return '09:00';
}

function pickEditable(body = {}) {
  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'notifyTime')) {
    updates.notifyTime = normalizeNotifyTime(updates.notifyTime);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'sendEmailReminder')) {
    updates.sendEmailReminder = Boolean(updates.sendEmailReminder);
  }
  return updates;
}

export const getEvents = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { user: req.user._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const events = await CalendarEvent.find(filter).sort({ date: 1, notifyTime: 1 });
    successResponse(res, events, 'Events fetched.');
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const payload = pickEditable(req.body);
    if (!payload.notifyTime) payload.notifyTime = '09:00';
    if (payload.sendEmailReminder === undefined) payload.sendEmailReminder = true;

    const event = await CalendarEvent.create({ ...payload, user: req.user._id });

    // Same pattern as debt repayment receipt: await SMTP before responding (required on Vercel).
    let emailed = false;
    let emailReason = 'skipped';
    if (req.user?.email) {
      try {
        emailed = await sendCalendarEventCreated({
          to: req.user.email,
          userName: req.user.name,
          currency: req.user.currency || 'INR',
          timeZone: req.user.timezone || 'Asia/Kolkata',
          event,
        });
        emailReason = emailed ? 'sent' : 'smtp_not_configured';
      } catch (mailError) {
        console.error('[CalendarMail] Create email failed:', mailError.message);
        emailReason = 'send_failed';
      }
    } else {
      emailReason = 'no_user_email';
      console.warn('[CalendarMail] Create email skipped — user has no email.');
    }

    return res.status(201).json({
      success: true,
      message: emailed
        ? 'Event created. A confirmation email was sent.'
        : 'Event created.',
      data: event,
      email: { sent: emailed, reason: emailReason },
      emailed,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const updates = pickEditable(req.body);
    // Changing date/time means a new reminder window — allow another send.
    if (updates.date !== undefined || updates.notifyTime !== undefined) {
      updates.lastReminderSentYmd = null;
    }

    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!event) return errorResponse(res, 'Event not found.', 404);
    successResponse(res, event, 'Event updated.');
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!event) return errorResponse(res, 'Event not found.', 404);
    successResponse(res, null, 'Event deleted.');
  } catch (error) {
    next(error);
  }
};
