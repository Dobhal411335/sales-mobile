import axios from 'axios';
import {api} from './api';
import {getDeviceFingerprint} from '../utils/deviceFingerprint';
import type {
  ActivateDeviceCredentials,
  AuthSession,
  LoginCredentials,
  PasscodeCredentials,
} from '../types/auth';
import {isDeviceActivationRequired, mapAuthError} from '../utils/authErrors';
import {clearEmployeeSessionTokens} from '../utils/secureStorage';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  action?: string;
  data?: T;
}

export class DeviceActivationRequiredError extends Error {
  constructor(message = 'Device activation required.') {
    super(message);
    this.name = 'DeviceActivationRequiredError';
  }
}

export async function getDeviceStatus(): Promise<boolean> {
  const response = await api.get<{success?: boolean; registered?: boolean}>(
    '/api/employee/auth/device-status',
  );
  return Boolean(response.data?.registered);
}

export async function activateDevice(
  credentials: ActivateDeviceCredentials,
): Promise<void> {
  try {
    await api.post<ApiEnvelope<never>>('/api/employee/auth/activate-device', {
      employeeId: credentials.employeeId.trim(),
      password: credentials.password,
      activationCode: credentials.activationCode.trim().toUpperCase(),
    });
  } catch (error) {
    throw new Error(mapAuthError(error, 'Activation failed.'));
  }
}

export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<void> {
  const browserFingerprint = await getDeviceFingerprint();
  try {
    await api.post<ApiEnvelope<{employee: unknown}>>(
      '/api/employee/auth/login',
      {
        employeeId: credentials.employeeId.trim(),
        password: credentials.password,
        browserFingerprint,
      },
    );
  } catch (error) {
    if (isDeviceActivationRequired(error)) {
      throw new DeviceActivationRequiredError(mapAuthError(error));
    }
    throw new Error(mapAuthError(error));
  }
}

export async function loginWithPasscode(
  credentials: PasscodeCredentials,
): Promise<void> {
  const browserFingerprint = await getDeviceFingerprint();
  try {
    await api.post<ApiEnvelope<{employee: unknown}>>(
      '/api/employee/auth/login',
      {
        passcode: credentials.passcode.trim(),
        browserFingerprint,
      },
    );
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function fetchCurrentSession(): Promise<AuthSession> {
  const response = await api.get<ApiEnvelope<AuthSession>>(
    '/api/employee/auth/me',
  );
  if (!response.data?.success || !response.data.data?.employee) {
    throw new Error('Unable to load employee session.');
  }
  return response.data.data;
}

export async function refreshSession(): Promise<boolean> {
  try {
    const response = await api.post<ApiEnvelope<never>>(
      '/api/employee/auth/refresh',
    );
    return Boolean(response.data?.success);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        await clearEmployeeSessionTokens();
      }
    }
    return false;
  }
}

export async function logoutFromServer(): Promise<void> {
  try {
    await api.post<ApiEnvelope<never>>('/api/employee/auth/logout');
  } catch {
    // Always clear local session even if network fails.
  } finally {
    await clearEmployeeSessionTokens();
  }
}

export async function restoreSession(): Promise<AuthSession | null> {
  try {
    return await fetchCurrentSession();
  } catch {
    const refreshed = await refreshSession();
    if (!refreshed) {
      await clearEmployeeSessionTokens();
      return null;
    }
    try {
      return await fetchCurrentSession();
    } catch {
      await clearEmployeeSessionTokens();
      return null;
    }
  }
}
