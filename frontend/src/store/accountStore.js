import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

function accountId(value) {
  return String(value?._id || value || '');
}

export function applyTxToAccounts(accounts, tx, reverse = false) {
  if (!tx) return accounts;
  const sign = reverse ? -1 : 1;
  const amt = Number(tx.amount) * sign;
  if (!Number.isFinite(amt)) return accounts;
  const fromId = accountId(tx.account);
  const toId = accountId(tx.toAccount);
  return accounts.map((a) => {
    const id = String(a._id);
    let next = a.balance;
    if (id === fromId) {
      if (tx.type === 'income') next += amt;
      else if (tx.type === 'expense' || tx.type === 'transfer') next -= amt;
    }
    if (tx.type === 'transfer' && toId && id === toId) next += amt;
    return next === a.balance ? a : { ...a, balance: next };
  });
}

export const useAccountStore = create((set, get) => ({
  accounts: [],
  isLoading: false,

  sparklines: {},
  fetchSparklines: async (days = 30) => {
    try {
      const { data } = await api.get('/accounts/sparklines', { params: { days } });
      set({ sparklines: data.data || {} });
    } catch (error) {
      /* sparklines are decorative — silence failures */
    }
  },

  fetchAccounts: async (includeArchived = false) => {
    const hasData = get().accounts.length > 0;
    if (!hasData) set({ isLoading: true });
    try {
      const { data } = await api.get('/accounts', { params: { includeArchived } });
      set({ accounts: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (!hasData) toast.error('Failed to fetch accounts');
    }
  },

  applyTxBalance: (tx, reverse = false) => {
    set((state) => ({ accounts: applyTxToAccounts(state.accounts, tx, reverse) }));
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
