import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

function upsertPlan(plans, updated) {
  const exists = plans.some((p) => p._id === updated._id);
  if (!exists) return [updated, ...plans];
  return plans.map((p) => (p._id === updated._id ? updated : p));
}

export const useIncomePlanStore = create((set, get) => ({
  plans: [],
  selectedId: null,
  isLoading: false,

  selectedPlan: () => get().plans.find((p) => p._id === get().selectedId) || null,

  fetchPlans: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/income-plans');
      const plans = data.data || [];
      const { selectedId } = get();
      const nextSelected = plans.some((p) => p._id === selectedId)
        ? selectedId
        : (plans[0]?._id || null);
      set({ plans, selectedId: nextSelected, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error('Failed to fetch income plans');
    }
  },

  selectPlan: (id) => set({ selectedId: id }),

  createPlan: async (payload) => {
    try {
      const { data } = await api.post('/income-plans', payload);
      set((state) => ({
        plans: [data.data, ...state.plans],
        selectedId: data.data._id,
      }));
      toast.success('Plan created');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create plan');
      return null;
    }
  },

  updatePlan: async (id, payload) => {
    try {
      const { data } = await api.put(`/income-plans/${id}`, payload);
      set((state) => ({ plans: upsertPlan(state.plans, data.data) }));
      toast.success('Plan updated');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update plan');
      return null;
    }
  },

  deletePlan: async (id) => {
    try {
      await api.delete(`/income-plans/${id}`);
      set((state) => {
        const plans = state.plans.filter((p) => p._id !== id);
        return {
          plans,
          selectedId: state.selectedId === id ? (plans[0]?._id || null) : state.selectedId,
        };
      });
      toast.success('Plan deleted');
      return true;
    } catch (error) {
      toast.error('Failed to delete plan');
      return false;
    }
  },

  addEntry: async (planId, payload) => {
    try {
      const { data } = await api.post(`/income-plans/${planId}/entries`, payload);
      set((state) => ({ plans: upsertPlan(state.plans, data.data) }));
      toast.success(payload.type === 'received' ? 'Received amount added' : 'Give item added');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add entry');
      return null;
    }
  },

  updateEntry: async (planId, entryId, payload) => {
    try {
      const { data } = await api.put(`/income-plans/${planId}/entries/${entryId}`, payload);
      set((state) => ({ plans: upsertPlan(state.plans, data.data) }));
      toast.success('Entry updated');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update entry');
      return null;
    }
  },

  toggleEntryDone: async (planId, entryId) => {
    try {
      const { data } = await api.patch(`/income-plans/${planId}/entries/${entryId}/done`);
      set((state) => ({ plans: upsertPlan(state.plans, data.data) }));
      toast.success(data.message || 'Updated');
      return data.data;
    } catch (error) {
      toast.error('Failed to update status');
      return null;
    }
  },

  deleteEntry: async (planId, entryId) => {
    try {
      const { data } = await api.delete(`/income-plans/${planId}/entries/${entryId}`);
      set((state) => ({ plans: upsertPlan(state.plans, data.data) }));
      toast.success('Entry removed');
      return data.data;
    } catch (error) {
      toast.error('Failed to delete entry');
      return null;
    }
  },

  postEntry: async (planId, entryId, payload) => {
    try {
      const { data } = await api.post(`/income-plans/${planId}/entries/${entryId}/post`, payload);
      set((state) => ({ plans: upsertPlan(state.plans, data.data.plan) }));
      toast.success('Posted to accounts');
      return data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post entry');
      return null;
    }
  },
}));
