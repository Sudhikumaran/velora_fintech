import { create } from 'zustand';
import { createElement } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useBudgetStore } from './financeStore';

function refreshBudgets() {
  useBudgetStore.getState().fetchBudgets();
}

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

  createTransaction: async (transactionData, { silent } = {}) => {
    try {
      const { data } = await api.post('/transactions', transactionData);
      set((state) => ({ transactions: [data.data, ...state.transactions] }));
      if (transactionData.type === 'expense') refreshBudgets();
      if (!silent) toast.success('Transaction added successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transaction');
      return null;
    }
  },

  updateTransaction: async (id, transactionData) => {
    try {
      const existing = get().transactions.find((t) => t._id === id);
      const { data } = await api.put(`/transactions/${id}`, transactionData);
      set((state) => ({
        transactions: state.transactions.map((t) => (t._id === id ? data.data : t)),
      }));
      if (existing?.type === 'expense' || transactionData.type === 'expense' || data.data?.type === 'expense') {
        refreshBudgets();
      }
      toast.success('Transaction updated successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update transaction');
      return null;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const existing = get().transactions.find((t) => t._id === id);
      const { data } = await api.delete(`/transactions/${id}`);
      set((state) => ({ transactions: state.transactions.filter((t) => t._id !== id) }));
      if (existing?.type === 'expense') refreshBudgets();
      const snapshot = data.data;
      toast((t) => createElement(
        'span',
        { className: 'flex items-center gap-3' },
        'Transaction deleted',
        snapshot
          ? createElement(
            'button',
            {
              className: 'text-indigo-600 font-semibold',
              onClick: async () => {
                toast.dismiss(t.id);
                await get().createTransaction({
                  account: snapshot.account?._id || snapshot.account,
                  toAccount: snapshot.toAccount?._id || snapshot.toAccount,
                  type: snapshot.type,
                  amount: snapshot.amount,
                  category: snapshot.category,
                  description: snapshot.description,
                  date: snapshot.date,
                  notes: snapshot.notes,
                  splits: snapshot.splits,
                }, { silent: true });
                toast.success('Transaction restored');
              },
            },
            'Undo'
          )
          : null
      ), { duration: 8000 });
      return true;
    } catch (error) {
      toast.error('Failed to delete transaction');
      return false;
    }
  },

  importTransactions: async (rows, defaultAccount) => {
    try {
      const { data } = await api.post('/transactions/import', { rows, defaultAccount });
      await get().fetchTransactions();
      toast.success(`Imported ${data.data.imported} transactions`);
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
      return null;
    }
  },

  repairBalances: async () => {
    try {
      const { data } = await api.post('/transactions/repair-balances', {}, { timeout: 60000 });
      toast.success(data.message || 'Account balances restored');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not restore balances');
      return null;
    }
  },

  postRecurring: async ({ silent } = {}) => {
    try {
      const { data } = await api.post('/transactions/post-recurring');
      if (data.data.posted) {
        await get().fetchTransactions();
        toast.success(`Posted ${data.data.posted} recurring transactions`);
      }
      return data.data;
    } catch (error) {
      if (!silent) toast.error('Failed to post recurring transactions');
      return null;
    }
  },

  archiveTransaction: async (id) => {
    try {
      const existing = get().transactions.find((t) => t._id === id);
      const { data } = await api.patch(`/transactions/${id}/archive`);
      set((state) => ({
        transactions: state.transactions.map((t) => (t._id === id ? data.data : t)),
      }));
      if (existing?.type === 'expense') refreshBudgets();
      toast.success(data.message);
      return true;
    } catch (error) {
      toast.error('Failed to archive transaction');
      return false;
    }
  },
}));
