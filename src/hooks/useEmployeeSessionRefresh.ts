import {useEffect} from 'react';
import {refreshSession} from '../services/authService';
import {useAuthStore} from '../store/authStore';
import {hasSessionTokens} from '../utils/secureStorage';

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

/**
 * Proactively refresh the employee session every 45 minutes (matches web).
 * Fails safely: transient network drops do not log out active floor staff.
 */
export function useEmployeeSessionRefresh(enabled = true): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }

    const refresh = async () => {
      try {
        const hasSession = await hasSessionTokens();
        if (!hasSession) {
          await logout();
          return;
        }

        const ok = await refreshSession();
        if (!ok) {
          const stillHasTokens = await hasSessionTokens();
          if (!stillHasTokens) {
            await logout();
          }
        }
      } catch {
        // Network errors during proactive background refresh should not evict the user
      }
    };

    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled, isAuthenticated, logout]);
}
