import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          localStorage.setItem('velora_token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
          toast.success('Welcome back!');
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error(error.response?.data?.message || (error.message === 'Network Error' ? 'Cannot reach the server. Check your internet connection.' : 'Login failed'));
          return false;
        }
      },

      register: async (name, email, password, currency) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { name, email, password, currency });
          localStorage.setItem('velora_token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
          toast.success('Account created successfully!');
          return true;
        } catch (error) {
          set({ isLoading: false });
          toast.error(error.response?.data?.message || 'Registration failed');
          return false;
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch { /* cookie may already be gone */ }
        localStorage.removeItem('velora_token');
        set({ user: null, token: null });
        toast.success('Logged out successfully');
      },

      forgotPassword: async (email) => {
        try {
          await api.post('/auth/forgot-password', { email });
          toast.success('If that email exists, a reset link was sent');
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || 'Could not send reset email');
          return false;
        }
      },

      resetPassword: async (token, password) => {
        try {
          const { data } = await api.post('/auth/reset-password', { token, password });
          if (data.token) localStorage.setItem('velora_token', data.token);
          set({ user: data.user, token: data.token });
          toast.success('Password reset. You are signed in.');
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || 'Reset failed');
          return false;
        }
      },

      deleteAccount: async (password) => {
        try {
          await api.delete('/auth/account', { data: { password } });
          localStorage.removeItem('velora_token');
          set({ user: null, token: null });
          toast.success('Account deleted');
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || 'Could not delete account');
          return false;
        }
      },

      updateProfile: async (profileData) => {
        try {
          const { data } = await api.put('/auth/profile', profileData);
          set({ user: data.data });
          toast.success('Profile updated successfully');
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || 'Update failed');
          return false;
        }
      },

      updatePassword: async (currentPassword, newPassword) => {
        try {
          await api.put('/auth/password', { currentPassword, newPassword });
          toast.success('Password updated successfully');
          return true;
        } catch (error) {
          toast.error(error.response?.data?.message || 'Password update failed');
          return false;
        }
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data });
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'velora-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
