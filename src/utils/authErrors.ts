import axios from 'axios';

const INACTIVE_PATTERNS = [
  'not active',
  'inactive',
  'suspended',
  'not authorized',
  'forbidden',
];

export function mapAuthError(error: unknown, fallback = 'Authentication failed.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Unable to connect to server. Please check your internet connection.';
    }

    const status = error.response.status;
    const data = error.response.data as {message?: string; action?: string} | undefined;
    const message = typeof data?.message === 'string' ? data.message.trim() : '';

    if (data?.action === 'DEVICE_ACTIVATION_REQUIRED') {
      return message || 'Device activation required.';
    }

    if (status === 401) {
      return message || 'Invalid username or password.';
    }

    if (status === 403) {
      const lower = message.toLowerCase();
      if (INACTIVE_PATTERNS.some((pattern) => lower.includes(pattern))) {
        return 'Your account is not authorized to use this POS.';
      }
      return message || 'Your account is not authorized to use this POS.';
    }

    if (status === 429) {
      return message || 'Too many attempts. Please try again later.';
    }

    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function isDeviceActivationRequired(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) {
    return false;
  }
  const data = error.response.data as {action?: string} | undefined;
  return data?.action === 'DEVICE_ACTIVATION_REQUIRED';
}

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
