import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Plus, Trash2, Edit3, Bell, DollarSign, Flag, StickyNote, X,
} from 'lucide-react';
import { useTransactionStore } from '../store/transactionStore';
import { useSubscriptionStore } from '../store/financeStore';
import { useCalendarStore } from '../store/calendarStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatters';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const EVENT_TYPES = [
  { value: 'reminder', label: 'Reminder',  icon: Bell,        color: '#6366f1' },
  { value: 'bill',     label: 'Bill / Due', icon: DollarSign,  color: '#ef4444' },
  { value: 'income',   label: 'Income',     icon: DollarSign,  color: '#22c55e' },
  { value: 'goal',     label: 'Goal',       icon: Flag,        color: '#f59e0b' },
  { value: 'note',     label: 'Note',       icon: StickyNote,  color: '#8b5cf6' },
];

const TYPE_COLORS = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t.color]));

const BLANK_FORM = {
  title: '', date: '', type: 'reminder', amount: '', color: '#6366f1',
  description: '', isRecurring: false, recurringFrequency: 'monthly',
};

function toLocalDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Calendar() {
  const { user } = useAuthStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { subscriptions, fetchSubscriptions } = useSubscriptionStore();
  const { events, fetchEvents, createEvent, updateEvent, deleteEvent } = useCalendarStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchTransactions({
      startDate: new Date(year, month, 1).toISOString(),
      endDate: new Date(year, month + 1, 0).toISOString(),
      limit: 200,
    });
    fetchSubscriptions();
    fetchEvents({
      startDate: new Date(year, month, 1).toISOString(),
      endDate: new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
    });
  }, [currentDate]);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const dateStr = (day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getEventsForDay = (day) => {
    const ds = dateStr(day);
    const txs = transactions
      .filter((tx) => new Date(tx.date).toISOString().split('T')[0] === ds)
      .map((tx) => ({ ...tx, _source: 'transaction' }));
    const subs = subscriptions
      .filter((s) => s.nextBillingDate && new Date(s.nextBillingDate).toISOString().split('T')[0] === ds)
      .map((s) => ({ ...s, _source: 'subscription', type: 'expense' }));
    const custom = events
      .filter((e) => toLocalDateStr(e.date) === ds)
      .map((e) => ({ ...e, _source: 'custom' }));
    return [...txs, ...subs, ...custom];
  };

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = (day) => {
    setEditingEvent(null);
    setForm({ ...BLANK_FORM, date: dateStr(day), color: '#6366f1' });
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      date: toLocalDateStr(event.date),
      type: event.type,
      amount: event.amount ?? '',
      color: event.color || '#6366f1',
      description: event.description || '',
      isRecurring: event.isRecurring || false,
      recurringFrequency: event.recurringFrequency || 'monthly',
    });
    setModalOpen(true);
  };

  const handleTypeChange = (type) => {
    setForm((f) => ({ ...f, type, color: TYPE_COLORS[type] || f.color }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      amount: form.amount !== '' ? parseFloat(form.amount) : null,
      recurringFrequency: form.isRecurring ? form.recurringFrequency : null,
    };
    if (editingEvent) {
      await updateEvent(editingEvent._id, payload);
    } else {
      await createEvent(payload);
    }
    setSaving(false);
    setModalOpen(false);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteEvent(eventId);
    // refresh selected date panel
    setSelectedDate((d) => d);
  };

  // ── Upcoming custom events (sidebar) ──────────────────────────────────────
  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Track bills, reminders & financial events"
        action={
          <button
            onClick={() => {
              const d = selectedDate ? dateStr(selectedDate) : toLocalDateStr(today);
              setEditingEvent(null);
              setForm({ ...BLANK_FORM, date: d });
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Add Event
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Calendar Grid ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-600 dark:text-gray-400 font-medium">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday    = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const isSelected = selectedDate === day;
              const hasIncome  = dayEvents.some((e) => e.type === 'income');
              const hasExpense = dayEvents.some((e) => e.type === 'expense');
              const hasCustom  = dayEvents.some((e) => e._source === 'custom');

              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  onDoubleClick={() => openCreate(day)}
                  title="Click to view · Double-click to add event"
                  className={`aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl transition-all text-sm relative
                    ${isToday    ? 'bg-indigo-600 text-white font-bold shadow-md' :
                      isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold ring-2 ring-indigo-400' :
                      'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'}`}
                >
                  <span className="leading-none">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {hasIncome  && <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-green-300' : 'bg-emerald-500'}`} />}
                      {hasExpense && <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-red-300' : 'bg-red-500'}`} />}
                      {hasCustom  && <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-purple-300' : 'bg-indigo-400'}`} />}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500" /> Income
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Expense / Bill
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-indigo-400" /> Custom event
            </div>
            <span className="text-xs text-gray-300 dark:text-gray-600 ml-auto">Double-click a date to add</span>
          </div>
        </div>

        {/* ── Right Panel ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Selected date events */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {selectedDate
                  ? `${MONTHS[month].slice(0, 3)} ${selectedDate}, ${year}`
                  : 'Day Events'}
              </h3>
              {selectedDate && (
                <button
                  onClick={() => openCreate(selectedDate)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  <Plus size={13} /> Add
                </button>
              )}
            </div>

            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <CalendarIcon size={28} className="text-gray-200 dark:text-gray-700 mb-2" />
                <p className="text-xs text-gray-400">Click a date to see events</p>
              </div>
            ) : selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-sm text-gray-400 mb-3">No events on this date</p>
                <button onClick={() => openCreate(selectedDate)} className="btn-primary py-2 px-3 text-xs">
                  <Plus size={13} /> Add event
                </button>
              </div>
            ) : (
              <AnimatePresence>
                <div className="space-y-2">
                  {selectedEvents.map((event, i) => {
                    const isCustom = event._source === 'custom';
                    const dotColor = isCustom ? (event.color || '#6366f1') : event.type === 'income' ? '#22c55e' : '#ef4444';
                    return (
                      <motion.div
                        key={event._id || i}
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl group"
                      >
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: dotColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {event._source === 'subscription' ? event.name :
                             event._source === 'custom'       ? event.title :
                             event.description || event.category}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {event._source === 'subscription' ? 'Subscription due' :
                             event._source === 'custom'       ? event.type :
                             event.category}
                          </p>
                        </div>
                        {event.amount && (
                          <p className={`text-sm font-bold shrink-0 ${event.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {event.type === 'income' ? '+' : '−'}{formatCurrency(event.amount, user?.currency)}
                          </p>
                        )}
                        {isCustom && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => openEdit(event)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              <Edit3 size={12} className="text-gray-400" />
                            </button>
                            <button onClick={() => handleDelete(event._id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <Trash2 size={12} className="text-red-400" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </div>

          {/* Upcoming custom events */}
          {upcomingEvents.length > 0 && (
            <div className="card p-5">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Upcoming Events</h4>
              <div className="space-y-2.5">
                {upcomingEvents.map((ev) => {
                  const daysUntil = Math.ceil((new Date(ev.date) - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={ev._id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ev.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{ev.type}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        daysUntil === 0 ? 'bg-red-100 text-red-600' :
                        daysUntil <= 3 ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming subscription bills */}
          <div className="card p-5">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Upcoming Bills</h4>
            <div className="space-y-2.5">
              {subscriptions
                .filter((s) => s.status === 'active' && s.nextBillingDate)
                .sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate))
                .slice(0, 5)
                .map((sub) => {
                  const daysUntil = Math.ceil((new Date(sub.nextBillingDate) - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={sub._id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sub.color || '#ef4444' }} />
                        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[110px]">{sub.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sub.amount, user?.currency)}</p>
                        <p className={`text-xs ${daysUntil <= 3 ? 'text-red-500' : 'text-gray-400'}`}>
                          {daysUntil <= 0 ? 'Due now' : `${daysUntil}d`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              {subscriptions.filter((s) => s.status === 'active').length === 0 && (
                <p className="text-xs text-gray-400">No active subscriptions</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Event Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? 'Edit Event' : 'Add Calendar Event'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event type selector */}
          <div>
            <label className="label">Event Type</label>
            <div className="grid grid-cols-5 gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs font-semibold ${
                    form.type === t.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 text-gray-500'
                  }`}
                >
                  <t.icon size={16} style={{ color: form.type === t.value ? t.color : undefined }} />
                  {t.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Title *</label>
            <input
              className="input-field"
              placeholder="e.g. Pay electricity bill"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            {(form.type === 'bill' || form.type === 'income') && (
              <div>
                <label className="label">Amount ({user?.currency || 'USD'})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <label className="label">Description</label>
            <input
              className="input-field"
              placeholder="Optional notes"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="label">Color</label>
              <input
                type="color"
                className="w-10 h-9 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer bg-transparent"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="label">Recurring?</label>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isRecurring: !f.isRecurring }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.isRecurring ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                {form.isRecurring && (
                  <select
                    className="input-field py-1.5 text-xs flex-1"
                    value={form.recurringFrequency}
                    onChange={(e) => setForm({ ...form, recurringFrequency: e.target.value })}
                  >
                    {['daily', 'weekly', 'monthly', 'yearly'].map((f) => (
                      <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : editingEvent ? 'Save Changes' : 'Add Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
