import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface SalesEmployee {
  id: string;
  name: string;
  role?: string;
  staffDiscount?: number;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapEmployeeApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (!error.response) {
      return 'Unable to load employees. Check your connection and try again.';
    }
  }
  return 'Unable to load employees.';
}

function toId(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as {_id: unknown})._id);
  }
  return String(value);
}

function normalizeEmployee(raw: Record<string, unknown>): SalesEmployee {
  const name =
    raw.name != null
      ? String(raw.name)
      : [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim();

  return {
    id: toId(raw.id ?? raw._id),
    name: name || 'Staff',
    role: raw.role ? String(raw.role) : undefined,
    staffDiscount:
      raw.staffDiscount != null ? Number(raw.staffDiscount) : undefined,
  };
}

export function isEmployeeApiConfigured(): boolean {
  return useLiveApi;
}

export async function fetchSalesEmployees(): Promise<SalesEmployee[]> {
  if (!useLiveApi) {
    throw new Error('API not configured');
  }

  try {
    const response = await api.get<ApiEnvelope<Record<string, unknown>[]>>(
      '/api/sales/employees',
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to load employees');
    }

    return (response.data.data || []).map((row) => normalizeEmployee(row));
  } catch (error) {
    throw new Error(mapEmployeeApiError(error));
  }
}
