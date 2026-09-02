import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface TableSessionDetails {
  id: string;
  tableId?: string;
  tableNumber?: string;
  floorName?: string;
  floorId?: string;
  guestCount?: number;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status?: string;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapSessionApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
      return "You don't have permission to view this session.";
    }
    if (status === 404) {
      return 'Table session no longer exists.';
    }
    if (!error.response) {
      return 'Unable to load session. Check your connection and try again.';
    }
  }
  return 'Unable to load session. Check your connection and try again.';
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

function normalizeSession(raw: Record<string, unknown>): TableSessionDetails {
  const tableNumber =
    raw.tableNumber != null
      ? String(raw.tableNumber)
      : raw.tableNumbers != null
        ? String(raw.tableNumbers)
        : undefined;

  const floorRaw = raw.floor as Record<string, unknown> | undefined;
  const floorName =
    raw.floorName != null
      ? String(raw.floorName)
      : floorRaw?.name != null
        ? String(floorRaw.name)
        : undefined;

  const floorId = toId(raw.floorId ?? floorRaw?._id ?? raw.floor);

  return {
    id: toId(raw.id ?? raw._id),
    tableId: raw.tableId ? toId(raw.tableId) : undefined,
    tableNumber,
    floorName,
    floorId: floorId || undefined,
    guestCount:
      raw.guestCount != null ? Number(raw.guestCount) : undefined,
    assignedEmployeeId: raw.assignedEmployeeId
      ? toId(raw.assignedEmployeeId)
      : undefined,
    assignedEmployeeName: raw.assignedEmployeeName
      ? String(raw.assignedEmployeeName)
      : undefined,
    status: raw.status ? String(raw.status) : undefined,
  };
}

export function isSessionApiConfigured(): boolean {
  return useLiveApi;
}

export async function fetchTableSession(
  sessionId: string,
): Promise<TableSessionDetails | null> {
  if (!useLiveApi) {
    throw new Error('API not configured');
  }

  try {
    const response = await api.get<ApiEnvelope<Record<string, unknown>>>(
      `/api/sales/sessions?sessionId=${encodeURIComponent(sessionId)}`,
    );

    if (!response.data?.success || !response.data.data) {
      return null;
    }

    return normalizeSession(response.data.data);
  } catch (error) {
    throw new Error(mapSessionApiError(error));
  }
}

export async function releaseTableSession(sessionId: string): Promise<void> {
  if (!useLiveApi) {
    throw new Error('API not configured');
  }

  try {
    const response = await api.put<ApiEnvelope<unknown>>('/api/sales/sessions', {
      sessionId,
      action: 'RELEASE',
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to release table');
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'API not configured') {
      throw new Error(mapSessionApiError(error));
    }
    throw error;
  }
}
