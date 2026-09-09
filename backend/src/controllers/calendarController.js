import CalendarEvent from '../models/CalendarEvent.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sendCalendarEventCreated, isEmailConfigured } from '../services/emailService.js';

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
  if (HHMM.test(raw)) return raw;
  // Accept "9:30" → "09:30"
  const m = raw.match(/^(\d{1,2}):([0-5]\d)$/);
  if (m) return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`;
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

async function sendCreateConfirmation(user, event) {
  if (!isEmailConfigured()) {
    console.warn('[CalendarMail] Create email skipped — SMTP_HOST/SMTP_USER/SMTP_PASS not set.');
    return { sent: false, reason: 'smtp_not_configured' };
  }
  if (!user?.email) {
    console.warn('[CalendarMail] Create email skipped — user has no email.');
    return { sent: false, reason: 'no_user_email' };
  }

  try {
    const ok = await sendCalendarEventCreated({
      to: user.email,
      userName: user.name,
      currency: user.currency || 'INR',
      timeZone: user.timezone || 'Asia/Kolkata',
      event,
    });
    if (ok) {
      console.log(`[CalendarMail] Create confirmation sent to ${user.email}`);
      return { sent: true, reason: 'sent' };
    }
    return { sent: false, reason: 'smtp_not_configured' };
  } catch (err) {
    console.error('[CalendarMail] Create email failed:', err.message);
    return { sent: false, reason: 'send_failed' };
  }
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
    const email = await sendCreateConfirmation(req.user, event);

    return res.status(201).json({
      success: true,
      message: email.sent
        ? 'Event created. Confirmation email sent.'
        : 'Event created.',
      data: event,
      email,
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
