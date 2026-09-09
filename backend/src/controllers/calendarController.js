import CalendarEvent from '../models/CalendarEvent.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

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

export const createEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.create({ ...pickEditable(req.body), user: req.user._id });
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
