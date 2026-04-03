import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  pagination: { total: 0, page: 1, limit: 20, pages: 0 },
  isLoading: false,
  filters: { type: '', category: '', account: '', startDate: '', endDate: '', search: '' },

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

  fetchTransactions: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const queryParams = { ...filters, ...params };
      Object.keys(queryParams).forEach((k) => !queryParams[k] && delete queryParams[k]);

      const { data } = await api.get('/transactions', { params: queryParams });
      set({
        transactions: data.data,
        pagination: data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch transactions');
    }
  },

  createTransaction: async (transactionData) => {
    try {
      const { data } = await api.post('/transactions', transactionData);
      set((state) => ({ transactions: [data.data, ...state.transactions] }));
      toast.success('Transaction added successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transaction');
      return null;
    }
  },

  updateTransaction: async (id, transactionData) => {
    try {
      const { data } = await api.put(`/transactions/${id}`, transactionData);
      set((state) => ({
        transactions: state.transactions.map((t) => (t._id === id ? data.data : t)),
      }));
      toast.success('Transaction updated successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update transaction');
      return null;
    }
  },

  deleteTransaction: async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      set((state) => ({ transactions: state.transactions.filter((t) => t._id !== id) }));
      toast.success('Transaction deleted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to delete transaction');
      return false;
    }
  },

  archiveTransaction: async (id) => {
    try {
      const { data } = await api.patch(`/transactions/${id}/archive`);
      set((state) => ({
        transactions: state.transactions.map((t) => (t._id === id ? data.data : t)),
      }));
      toast.success(data.message);
      return true;
    } catch (error) {
      toast.error('Failed to archive transaction');
      return false;
    }
  },
}));
