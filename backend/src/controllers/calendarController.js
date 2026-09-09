import CalendarEvent from '../models/CalendarEvent.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sendCalendarEventCreated, isEmailConfigured } from '../services/emailService.js';

const EDITABLE_FIELDS = ['title', 'date', 'type', 'amount', 'color', 'description', 'isRecurring', 'recurringFrequency'];

export const getEvents = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { user: req.user._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const events = await CalendarEvent.find(filter).sort({ date: 1 });
    successResponse(res, events, 'Events fetched.');
  } catch (error) {
    next(error);
  }
};

function pickEditable(body = {}) {
  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) updates[key] = body[key];
  }
  return updates;
}

function notifyEventCreated(user, event) {
  if (!isEmailConfigured() || !user?.email) return;
  // Fire-and-forget so create stays fast even if SMTP is slow.
  sendCalendarEventCreated({
    to: user.email,
    userName: user.name,
    currency: user.currency || 'INR',
    timeZone: user.timezone || 'Asia/Kolkata',
    event,
  }).catch((err) => {
    console.error('[CalendarMail] Create email failed:', err.message);
  });
}

export const createEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.create({ ...pickEditable(req.body), user: req.user._id });
    notifyEventCreated(req.user, event);
    successResponse(res, event, 'Event created.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      pickEditable(req.body),
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
