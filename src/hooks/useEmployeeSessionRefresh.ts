import {useEffect} from 'react';
import {refreshSession} from '../services/authService';
import {useAuthStore} from '../store/authStore';

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

/**
 * Proactively refresh the employee session every 45 minutes (matches web).
 */
export function useEmployeeSessionRefresh(enabled = true): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    const refresh = async () => {
      const ok = await refreshSession();
      if (!ok) {
        await logout();
      }
    };

    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled, isAuthenticated, logout]);
}
