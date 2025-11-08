import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api/auth';
import type { UserResponse } from '@/types';

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  oauthLogin: (token: string, provider: 'google' | 'microsoft') => Promise<void>;
  sendEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await authApi.login({ email, password });
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
          await get().loadUser();
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Invalid email or password',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      register: async (email: string, password: string, firstName?: string, lastName?: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          });
          await get().login(email, password);
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Registration failed. Please try again.',
            isLoading: false,
          });
          throw error;
        }
      },
      oauthLogin: async (token: string, provider: 'google' | 'microsoft') => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await authApi.oauthLogin({ token, provider });
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
          await get().loadUser();
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'OAuth login failed. Please try again.',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      sendEmailCode: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.sendEmailCode({ email });
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Failed to send verification code. Please try again.',
            isLoading: false,
          });
          throw error;
        }
      },
      verifyEmailCode: async (email: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await authApi.verifyEmailCode({ email, code });
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
          await get().loadUser();
        } catch (error: any) {
          set({
            error: error.response?.data?.detail || 'Invalid verification code. Please try again.',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },
      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return;
        }
        try {
          const tokens = await authApi.refresh(refreshToken);
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
          });
        } catch (error) {
          get().logout();
          throw error;
        }
      },
      loadUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch (error) {
          // don't logout immediately, the refresh token might still be valid
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // skip hydration of isLoading and error to prevent stale state
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        isLoading: false, // start with loading false
        error: null, // start with no error
      }),
    }
  )
);
