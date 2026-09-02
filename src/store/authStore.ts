import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {config} from '../constants/config';
import {setAuthFailureHandler} from '../services/api';
import {
  activateDevice,
  DeviceActivationRequiredError,
  fetchCurrentSession,
  loginWithCredentials,
  loginWithPasscode,
  logoutFromServer,
  restoreSession,
} from '../services/authService';
import {deviceService} from '../services/deviceService';
import type {
  ActivateDeviceCredentials,
  AuthSession,
  AuthUser,
  EmployeeProfile,
  EmployeeShift,
  LoginCredentials,
  LoginResult,
  PasscodeCredentials,
} from '../types/auth';
import {mapAuthError} from '../utils/authErrors';
import {hasSessionTokens} from '../utils/secureStorage';

const REMEMBERED_EMPLOYEE_ID_KEY = 'rememberedEmployeeId';

interface AuthState {
  user: AuthUser | null;
  employee: EmployeeProfile | null;
  restaurant: string | null;
  permissions: EmployeeProfile['permissions'];
  shift: EmployeeShift | null;
  deviceRegistered: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refreshDeviceStatus: () => Promise<void>;
  login: (
    credentials: LoginCredentials | PasscodeCredentials,
    options?: {usePasscode?: boolean},
  ) => Promise<LoginResult>;
  activateAndLogin: (
    activation: ActivateDeviceCredentials,
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  clearError: () => void;
  rememberEmployeeId: (employeeId: string | null) => Promise<void>;
  loadRememberedEmployeeId: () => Promise<string | null>;
}

function mapSessionToUser(session: AuthSession): {
  user: AuthUser;
  employee: EmployeeProfile;
} {
  const {employee} = session;
  const name = `${employee.firstName} ${employee.lastName || ''}`.trim();
  return {
    employee,
    user: {
      id: String(employee.id || employee._id),
      employeeId: employee.employeeId,
      name,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      restaurant: String(employee.restaurant),
    },
  };
}

function applySession(set: (partial: Partial<AuthState>) => void, session: AuthSession) {
  const {user, employee} = mapSessionToUser(session);
  set({
    user,
    employee,
    restaurant: String(employee.restaurant),
    permissions: employee.permissions ?? [],
    shift: session.shift,
    isAuthenticated: true,
    error: null,
  });
}

function resetAuthState(set: (partial: Partial<AuthState>) => void) {
  set({
    user: null,
    employee: null,
    restaurant: null,
    permissions: [],
    shift: null,
    isAuthenticated: false,
    error: null,
  });
}

export const useAuthStore = create<AuthState>((set, get) => {
  setAuthFailureHandler(() => {
    resetAuthState(set);
    set({isLoading: false});
  });

  return {
    user: null,
    employee: null,
    restaurant: null,
    permissions: [],
    shift: null,
    deviceRegistered: false,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true,
    error: null,

    initialize: async () => {
      if (!config.API_BASE_URL) {
        set({isInitializing: false, deviceRegistered: false});
        return;
      }

      set({isInitializing: true});
      try {
        const [registered, hasSession] = await Promise.all([
          deviceService.getStatus(),
          hasSessionTokens(),
        ]);
        set({deviceRegistered: registered});

        if (hasSession) {
          const session = await restoreSession();
          if (session) {
            applySession(set, session);
          } else {
            resetAuthState(set);
          }
        }
      } catch {
        resetAuthState(set);
      } finally {
        set({isInitializing: false});
      }
    },

    refreshDeviceStatus: async () => {
      if (!config.API_BASE_URL) {
        set({deviceRegistered: false});
        return;
      }
      try {
        const registered = await deviceService.getStatus();
        set({deviceRegistered: registered});
      } catch {
        set({deviceRegistered: false});
      }
    },

    login: async (credentials, options) => {
      if (!config.API_BASE_URL) {
        set({
          error:
            'Backend URL is not configured. Set API_BASE_URL in your .env file.',
        });
        return {success: false, error: 'Backend URL is not configured.'};
      }

      const usePasscode = options?.usePasscode ?? false;

      if (usePasscode) {
        const passcode = (credentials as PasscodeCredentials).passcode?.trim();
        if (!passcode) {
          const message = 'Enter your passcode.';
          set({error: message});
          return {success: false, error: message};
        }
      } else {
        const {employeeId, password} = credentials as LoginCredentials;
        if (!employeeId?.trim() || !password) {
          const message = 'Enter your Employee ID and password.';
          set({error: message});
          return {success: false, error: message};
        }
      }

      set({isLoading: true, error: null});

      try {
        if (usePasscode) {
          await loginWithPasscode(credentials as PasscodeCredentials);
        } else {
          await loginWithCredentials(credentials as LoginCredentials);
        }

        const session = await fetchCurrentSession();
        applySession(set, session);
        set({isLoading: false, deviceRegistered: true});
        return {success: true};
      } catch (error) {
        if (error instanceof DeviceActivationRequiredError) {
          set({isLoading: false});
          return {
            success: false,
            needsActivation: true,
            error: error.message,
          };
        }

        const message = mapAuthError(error);
        set({isLoading: false, error: message});
        return {success: false, error: message};
      }
    },

    activateAndLogin: async (activation) => {
      if (!config.API_BASE_URL) {
        const message = 'Backend URL is not configured.';
        set({error: message});
        return {success: false, error: message};
      }

      if (
        !activation.employeeId?.trim() ||
        !activation.password ||
        !activation.activationCode?.trim()
      ) {
        const message = 'Enter the activation code.';
        set({error: message});
        return {success: false, error: message};
      }

      set({isLoading: true, error: null});

      try {
        await activateDevice(activation);
        set({deviceRegistered: true});
        await loginWithCredentials({
          employeeId: activation.employeeId,
          password: activation.password,
        });
        const session = await fetchCurrentSession();
        applySession(set, session);
        set({isLoading: false});
        return {success: true};
      } catch (error) {
        const message = mapAuthError(error, 'Activation failed.');
        set({isLoading: false, error: message});
        return {success: false, error: message};
      }
    },

    logout: async () => {
      set({isLoading: true});
      try {
        await logoutFromServer();
      } finally {
        resetAuthState(set);
        set({isLoading: false});
        await get().refreshDeviceStatus();
      }
    },

    clearError: () => set({error: null}),

    rememberEmployeeId: async (employeeId) => {
      if (employeeId) {
        await AsyncStorage.setItem(REMEMBERED_EMPLOYEE_ID_KEY, employeeId);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMPLOYEE_ID_KEY);
      }
    },

    loadRememberedEmployeeId: async () => {
      const value = await AsyncStorage.getItem(REMEMBERED_EMPLOYEE_ID_KEY);
      return value?.trim() || null;
    },
  };
});
