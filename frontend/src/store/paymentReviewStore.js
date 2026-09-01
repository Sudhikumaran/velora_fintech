import { create } from 'zustand';

const QUEUE_KEY = 'velora_pay_review';

function loadQueue() {
  try {
    const rows = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function persist(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-40)));
}

export const usePaymentReviewStore = create((set, get) => ({
  queue: loadQueue(),
  open: loadQueue().length > 0,

  enqueue(item) {
    if (!item?.sourceId) return;
    const queue = get().queue;
    if (queue.some((row) => row.sourceId === item.sourceId || (item.noteId && row.noteId === item.noteId))) {
      if (!get().open) set({ open: true });
      return;
    }
    const next = [...queue, item].slice(-40);
    persist(next);
    set({ queue: next, open: true });
  },

  openAt(id) {
    const queue = get().queue;
    const idx = queue.findIndex((row) => row.sourceId === id || row.noteId === id);
    if (idx < 0) return;
    const next = [queue[idx], ...queue.filter((_, i) => i !== idx)];
    persist(next);
    set({ queue: next, open: true });
  },

  dismiss() {
    set({ open: false });
  },

  reopen() {
    if (get().queue.length) set({ open: true });
  },

  removeCurrent() {
    const next = get().queue.slice(1);
    persist(next);
    set({ queue: next, open: next.length > 0 });
  },

  removeBySourceId(sourceId) {
    const next = get().queue.filter((row) => row.sourceId !== sourceId);
    persist(next);
    set({ queue: next, open: get().open && next.length > 0 });
  },

  clearAll() {
    persist([]);
    set({ queue: [], open: false });
  },
}));
