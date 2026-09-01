import {create} from 'zustand';
import type {AuthUser, LoginCredentials} from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /**
   * TEMPORARY mock authentication for navigation testing only.
   * Replace with real employee auth against the existing backend.
   */
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async ({username, password}) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      set({error: 'Enter your username/email and password.'});
      return false;
    }

    set({isLoading: true, error: null});

    // Artificial delay so the Login loading state is visible during mock sign-in.
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 600);
    });

    set({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: 'mock-employee',
        name: 'Demo Employee',
        username: trimmedUsername,
      },
      error: null,
    });

    return true;
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => set({error: null}),
}));
