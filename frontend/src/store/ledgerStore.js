import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

const startOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const today = () => new Date().toISOString().split('T')[0];

export const useLedgerStore = create((set, get) => ({
  data: null,
  isLoading: false,
  filters: {
    view: 'trial-balance',
    account: '',
    startDate: startOfMonth(),
    endDate: today(),
    search: '',
  },

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

  clearLedger: () => set({ data: null }),

  fetchLedger: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const queryParams = { ...filters, ...params };
      Object.keys(queryParams).forEach((k) => {
        if (queryParams[k] === '' || queryParams[k] == null) delete queryParams[k];
      });

      const { data } = await api.get('/ledger', { params: queryParams });
      set({ data: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.response?.data?.message || 'Failed to fetch ledger');
    }
  },
}));
