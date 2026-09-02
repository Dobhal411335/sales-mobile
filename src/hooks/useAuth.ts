import {useAuthStore} from '../store/authStore';

/**
 * Thin auth hook over the Zustand auth store.
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const employee = useAuthStore((state) => state.employee);
  const restaurant = useAuthStore((state) => state.restaurant);
  const permissions = useAuthStore((state) => state.permissions);
  const shift = useAuthStore((state) => state.shift);
  const deviceRegistered = useAuthStore((state) => state.deviceRegistered);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const activateAndLogin = useAuthStore((state) => state.activateAndLogin);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);
  const refreshDeviceStatus = useAuthStore((state) => state.refreshDeviceStatus);
  const rememberEmployeeId = useAuthStore((state) => state.rememberEmployeeId);
  const loadRememberedEmployeeId = useAuthStore(
    (state) => state.loadRememberedEmployeeId,
  );

  return {
    user,
    employee,
    restaurant,
    permissions,
    shift,
    deviceRegistered,
    isAuthenticated,
    isLoading,
    isInitializing,
    error,
    login,
    activateAndLogin,
    logout,
    clearError,
    refreshDeviceStatus,
    rememberEmployeeId,
    loadRememberedEmployeeId,
  };
}
