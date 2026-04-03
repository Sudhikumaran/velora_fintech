import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useAccountStore = create((set, get) => ({
  accounts: [],
  isLoading: false,

  fetchAccounts: async (includeArchived = false) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/accounts', { params: { includeArchived } });
      set({ accounts: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch accounts');
    }
  },

  createAccount: async (accountData) => {
    try {
      const { data } = await api.post('/accounts', accountData);
      set((state) => ({ accounts: [data.data, ...state.accounts] }));
      toast.success('Account created successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create account');
      return null;
    }
  },

  updateAccount: async (id, accountData) => {
    try {
      const { data } = await api.put(`/accounts/${id}`, accountData);
      set((state) => ({
        accounts: state.accounts.map((a) => (a._id === id ? data.data : a)),
      }));
      toast.success('Account updated successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update account');
      return null;
    }
  },

  deleteAccount: async (id) => {
    try {
      await api.delete(`/accounts/${id}`);
      set((state) => ({ accounts: state.accounts.filter((a) => a._id !== id) }));
      toast.success('Account deleted successfully');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
      return false;
    }
  },

  archiveAccount: async (id) => {
    try {
      const { data } = await api.patch(`/accounts/${id}/archive`);
      set((state) => ({
        accounts: state.accounts.map((a) => (a._id === id ? data.data : a)),
      }));
      toast.success(data.message);
      return true;
    } catch (error) {
      toast.error('Failed to archive account');
      return false;
    }
  },

  getTotalBalance: () => {
    return get().accounts
      .filter((a) => !a.isArchived && a.type !== 'credit')
      .reduce((sum, a) => sum + a.balance, 0);
  },
}));
