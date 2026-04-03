import CalendarEvent from '../models/CalendarEvent.js';
import { successResponse } from '../utils/apiResponse.js';

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

export const createEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.create({ ...req.body, user: req.user._id });
    successResponse(res, event, 'Event created.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    successResponse(res, event, 'Event updated.');
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
    successResponse(res, null, 'Event deleted.');
  } catch (error) {
    next(error);
  }
};
