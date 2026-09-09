import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from '../utils/api';

export const useCalendarStore = create((set, get) => ({
  events: [],

  fetchEvents: async (params = {}) => {
    try {
      const { data } = await api.get('/calendar-events', { params });
      set({ events: data.data });
    } catch {
      toast.error('Failed to load calendar events');
    }
  },

  createEvent: async (payload) => {
    try {
      const { data } = await api.post('/calendar-events', payload, { timeout: 45000 });
      set((s) => ({ events: [...s.events, data.data] }));
      if (data.email?.sent || data.emailed) {
        toast.success('Event added — confirmation email sent');
      } else if (data.email?.reason === 'smtp_not_configured') {
        toast.error('Event saved, but email is off on the server (SMTP).');
      } else if (data.email?.reason === 'send_failed') {
        toast.error('Event saved, but confirmation email failed. Check spam or SMTP.');
      } else if (data.email?.reason === 'no_user_email') {
        toast.error('Event saved, but your account has no email address.');
      } else {
        toast.success(data.message || 'Event added!');
      }
      return data.data;
    } catch {
      toast.error('Failed to create event');
    }
  },

  updateEvent: async (id, payload) => {
    try {
      const { data } = await api.put(`/calendar-events/${id}`, payload);
      set((s) => ({ events: s.events.map((e) => (e._id === id ? data.data : e)) }));
      toast.success('Event updated!');
    } catch {
      toast.error('Failed to update event');
    }
  },

  deleteEvent: async (id) => {
    try {
      await api.delete(`/calendar-events/${id}`);
      set((s) => ({ events: s.events.filter((e) => e._id !== id) }));
      toast.success('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    }
  },
}));
