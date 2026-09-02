import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface StartTableSessionPayload {
  tableId: string;
  guestCount: number;
  linkedTableIds?: string[];
  notes?: string;
}

export interface StartTableSessionResult {
  sessionId: string;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapSessionApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message = (error.response?.data as {message?: string})?.message;

    if (status === 409) {
      return message || 'This table is already in use.';
    }
    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
      return "You don't have permission to assign tables.";
    }
    if (!error.response) {
      return 'Network error. Check your connection and try again.';
    }
    return message || 'Failed to assign table.';
  }
  return 'Failed to assign table.';
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

export async function startTableSession(
  payload: StartTableSessionPayload,
): Promise<StartTableSessionResult> {
  if (!useLiveApi) {
    throw new Error('API not configured');
  }

  try {
    const response = await api.post<ApiEnvelope<Record<string, unknown>>>(
      '/api/sales/sessions',
      {
        tableId: payload.tableId,
        guestCount: payload.guestCount,
        linkedTableIds: payload.linkedTableIds ?? [],
        notes: payload.notes ?? '',
      },
    );

    if (!response.data?.success || !response.data.data) {
      throw new Error(response.data?.message || 'Failed to assign table');
    }

    const sessionId = toId(
      response.data.data._id ?? response.data.data.id,
    );

    if (!sessionId) {
      throw new Error('Session created but no session ID returned');
    }

    return {sessionId};
  } catch (error) {
    if (error instanceof Error && error.message !== 'API not configured') {
      throw new Error(mapSessionApiError(error));
    }
    throw error;
  }
}
