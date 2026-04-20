import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

const createCrudStore = (endpoint, storeName) => ({
  items: [],
  isLoading: false,

  fetch: async (params = {}) => {},
  create: async (data) => {},
  update: async (id, data) => {},
  remove: async (id) => {},
});

export const useBudgetStore = create((set) => ({
  budgets: [],
  isLoading: false,

  fetchBudgets: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/budgets');
      set({ budgets: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch budgets');
    }
  },

  createBudget: async (budgetData) => {
    try {
      const { data } = await api.post('/budgets', budgetData);
      set((state) => ({ budgets: [data.data, ...state.budgets] }));
      toast.success('Budget created successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create budget');
      return null;
    }
  },

  updateBudget: async (id, budgetData) => {
    try {
      const { data } = await api.put(`/budgets/${id}`, budgetData);
      set((state) => ({ budgets: state.budgets.map((b) => (b._id === id ? data.data : b)) }));
      toast.success('Budget updated successfully');
      return data.data;
    } catch (error) {
      toast.error('Failed to update budget');
      return null;
    }
  },

  deleteBudget: async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      set((state) => ({ budgets: state.budgets.filter((b) => b._id !== id) }));
      toast.success('Budget deleted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to delete budget');
      return false;
    }
  },
}));

export const useDebtStore = create((set) => ({
  debts: [],
  isLoading: false,

  fetchDebts: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/debts', { params });
      set({ debts: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch debts');
    }
  },

  createDebt: async (debtData) => {
    try {
      const { data } = await api.post('/debts', debtData);
      set((state) => ({ debts: [data.data, ...state.debts] }));
      toast.success('Debt recorded successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create debt');
      return null;
    }
  },

  updateDebt: async (id, debtData) => {
    try {
      const { data } = await api.put(`/debts/${id}`, debtData);
      set((state) => ({ debts: state.debts.map((d) => (d._id === id ? data.data : d)) }));
      toast.success('Debt updated successfully');
      return data.data;
    } catch (error) {
      toast.error('Failed to update debt');
      return null;
    }
  },

  deleteDebt: async (id) => {
    try {
      await api.delete(`/debts/${id}`);
      set((state) => ({ debts: state.debts.filter((d) => d._id !== id) }));
      toast.success('Debt deleted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to delete debt');
      return false;
    }
  },

  addRepayment: async (id, repaymentData) => {
    try {
      const { data } = await api.post(`/debts/${id}/repayments`, repaymentData);
      set((state) => ({ debts: state.debts.map((d) => (d._id === id ? data.data : d)) }));
      toast.success('Repayment added successfully');
      return data.data;
    } catch (error) {
      toast.error('Failed to add repayment');
      return null;
    }
  },
}));

export const useInvestmentStore = create((set) => ({
  investments: [],
  isLoading: false,

  fetchInvestments: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/investments', { params });
      set({ investments: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch investments');
    }
  },

  createInvestment: async (investmentData) => {
    try {
      const { data } = await api.post('/investments', investmentData);
      set((state) => ({ investments: [data.data, ...state.investments] }));
      toast.success('Investment added successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add investment');
      return null;
    }
  },

  updateInvestment: async (id, investmentData) => {
    try {
      const { data } = await api.put(`/investments/${id}`, investmentData);
      set((state) => ({ investments: state.investments.map((i) => (i._id === id ? data.data : i)) }));
      toast.success('Investment updated successfully');
      return data.data;
    } catch (error) {
      toast.error('Failed to update investment');
      return null;
    }
  },

  deleteInvestment: async (id) => {
    try {
      await api.delete(`/investments/${id}`);
      set((state) => ({ investments: state.investments.filter((i) => i._id !== id) }));
      toast.success('Investment deleted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to delete investment');
      return false;
    }
  },

  updatePrice: async (id, currentPrice, note = '') => {
    try {
      const { data } = await api.patch(`/investments/${id}/price`, { currentPrice, note });
      set((state) => ({ investments: state.investments.map((i) => (i._id === id ? data.data : i)) }));
      toast.success('Price updated');
      return data.data;
    } catch (error) {
      toast.error('Failed to update price');
      return null;
    }
  },

  fetchPriceHistory: async (id, days = 30) => {
    try {
      const { data } = await api.get(`/investments/${id}/price-history`, { params: { days } });
      return data.data;
    } catch (error) {
      toast.error('Failed to load price history');
      return null;
    }
  },
}));

export const useSubscriptionStore = create((set) => ({
  subscriptions: [],
  isLoading: false,

  fetchSubscriptions: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/subscriptions', { params });
      set({ subscriptions: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch subscriptions');
    }
  },

  createSubscription: async (subscriptionData) => {
    try {
      const { data } = await api.post('/subscriptions', subscriptionData);
      set((state) => ({ subscriptions: [data.data, ...state.subscriptions] }));
      toast.success('Subscription added successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add subscription');
      return null;
    }
  },

  updateSubscription: async (id, subscriptionData) => {
    try {
      const { data } = await api.put(`/subscriptions/${id}`, subscriptionData);
      set((state) => ({ subscriptions: state.subscriptions.map((s) => (s._id === id ? data.data : s)) }));
      toast.success('Subscription updated successfully');
      return data.data;
    } catch (error) {
      toast.error('Failed to update subscription');
      return null;
    }
  },

  deleteSubscription: async (id) => {
    try {
      await api.delete(`/subscriptions/${id}`);
      set((state) => ({ subscriptions: state.subscriptions.filter((s) => s._id !== id) }));
      toast.success('Subscription deleted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to delete subscription');
      return false;
    }
  },

  toggleStatus: async (id) => {
    try {
      const { data } = await api.patch(`/subscriptions/${id}/toggle`);
      set((state) => ({ subscriptions: state.subscriptions.map((s) => (s._id === id ? data.data : s)) }));
      toast.success(data.message);
      return data.data;
    } catch (error) {
      toast.error('Failed to toggle subscription');
      return null;
    }
  },
}));

export const useGoalStore = create((set) => ({
  goals: [],
  isLoading: false,

  fetchGoals: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/goals', { params });
      set({ goals: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch goals');
    }
  },

  createGoal: async (goalData) => {
    try {
      const { data } = await api.post('/goals', goalData);
      set((state) => ({ goals: [data.data, ...state.goals] }));
      toast.success('Goal created successfully');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create goal');
      return null;
    }
  },

  updateGoal: async (id, goalData) => {
    try {
      const { data } = await api.put(`/goals/${id}`, goalData);
      set((state) => ({ goals: state.goals.map((g) => (g._id === id ? data.data : g)) }));
      toast.success('Goal updated successfully');
      return data.data;
    } catch (error) {
      toast.error('Failed to update goal');
      return null;
    }
  },

  deleteGoal: async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      set((state) => ({ goals: state.goals.filter((g) => g._id !== id) }));
      toast.success('Goal deleted successfully');
      return true;
    } catch (error) {
      toast.error('Failed to delete goal');
      return false;
    }
  },

  addContribution: async (id, contributionData) => {
    try {
      const { data } = await api.post(`/goals/${id}/contributions`, contributionData);
      set((state) => ({ goals: state.goals.map((g) => (g._id === id ? data.data : g)) }));
      toast.success('Contribution added successfully');
      return data.data;
    } catch (error) {
      toast.error('Failed to add contribution');
      return null;
    }
  },
}));

export const useAnalyticsStore = create((set) => ({
  dashboard: null,
  spendingByCategory: [],
  monthlyTrend: [],
  cashFlow: [],
  dailyReport: { series: [], startDate: null, endDate: null },
  isLoading: false,

  fetchDashboard: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/analytics/dashboard');
      set({ dashboard: data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  fetchSpendingByCategory: async (params = {}) => {
    try {
      const { data } = await api.get('/analytics/spending-by-category', { params });
      set({ spendingByCategory: data.data });
    } catch (error) {
      toast.error('Failed to fetch spending data');
    }
  },

  fetchMonthlyTrend: async (params = {}) => {
    try {
      const { data } = await api.get('/analytics/monthly-trend', { params });
      set({ monthlyTrend: data.data });
    } catch (error) {
      toast.error('Failed to fetch trend data');
    }
  },

  fetchCashFlow: async (params = {}) => {
    try {
      const { data } = await api.get('/analytics/cash-flow', { params });
      set({ cashFlow: data.data });
    } catch (error) {
      toast.error('Failed to fetch cash flow');
    }
  },

  fetchDailyReport: async (params = {}) => {
    try {
      const { data } = await api.get('/analytics/income-vs-expense', { params });
      set({ dailyReport: data.data });
    } catch (error) {
      toast.error('Failed to fetch daily income & expense');
    }
  },

  netWorth: null,
  fetchNetWorth: async () => {
    try {
      const { data } = await api.get('/analytics/net-worth');
      set({ netWorth: data.data });
    } catch (error) {}
  },
}));
