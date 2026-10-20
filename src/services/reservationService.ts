import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import type {
  PatchReservationResponse,
  PendingCountResponse,
  ReservationPatchAction,
  ReservationsResponse,
  TableReservation,
} from '../types/reservation';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapReservationApiError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message = (error.response?.data as {message?: string})?.message;
    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
      return "You don't have permission to manage bookings.";
    }
    if (!error.response) {
      return 'Unable to reach the server. Check your connection and try again.';
    }
    return message || fallback;
  }
  return fallback;
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

function normalizeReservation(raw: Record<string, unknown>): TableReservation {
  const id = toId(raw._id ?? raw.id);
  const specialRequest = raw.specialRequest
    ? String(raw.specialRequest)
    : raw.notes
      ? String(raw.notes)
      : undefined;
  return {
    id,
    _id: id,
    guestName: String(raw.guestName ?? ''),
    phone: String(raw.phone ?? ''),
    countryCode: raw.countryCode ? String(raw.countryCode) : undefined,
    email: raw.email ? String(raw.email) : undefined,
    date: String(raw.date ?? ''),
    time: String(raw.time ?? ''),
    guests: Number(raw.guests) || 1,
    reasonForVisit: raw.reasonForVisit
      ? String(raw.reasonForVisit)
      : undefined,
    specialRequest,
    status: String(raw.status ?? 'PENDING') as TableReservation['status'],
    notes: raw.notes ? String(raw.notes) : undefined,
    staffNote: raw.staffNote ? String(raw.staffNote) : undefined,
    assignedTableId: raw.assignedTableId
      ? String(raw.assignedTableId)
      : undefined,
    assignedTableNo: raw.assignedTableNo
      ? String(raw.assignedTableNo)
      : undefined,
    tableSessionId: raw.tableSessionId
      ? String(raw.tableSessionId)
      : undefined,
    source: raw.source ? String(raw.source) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export async function fetchTodayReservations(): Promise<ReservationsResponse> {
  if (!useLiveApi) {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    return {success: true, data: []};
  }

  try {
    const response = await api.get<ApiEnvelope<Record<string, unknown>[]>>(
      '/api/sales/reservations',
    );
    if (!response.data?.success) {
      return {
        success: false,
        message: response.data?.message || 'Failed to load bookings',
      };
    }
    return {
      success: true,
      data: (response.data.data || []).map((row) => normalizeReservation(row)),
    };
  } catch (error) {
    return {
      success: false,
      message: mapReservationApiError(error, 'Failed to load bookings'),
    };
  }
}

export async function fetchPendingReservationCount(): Promise<PendingCountResponse> {
  if (!useLiveApi) {
    return {success: true, data: {pendingCount: 0}};
  }

  try {
    const response = await api.get<ApiEnvelope<{pendingCount?: number}>>(
      '/api/sales/reservations?pendingCount=true',
    );
    if (!response.data?.success) {
      return {
        success: false,
        message: response.data?.message || 'Failed to load pending count',
      };
    }
    return {
      success: true,
      data: {
        pendingCount: Number(response.data.data?.pendingCount || 0),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: mapReservationApiError(error, 'Failed to load pending count'),
    };
  }
}

export async function patchReservation(
  reservationId: string,
  action: ReservationPatchAction,
  extra?: {assignedTableNo?: string; tableId?: string},
): Promise<PatchReservationResponse> {
  if (!useLiveApi) {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    return {
      success: false,
      message: 'Live API is required to update bookings.',
    };
  }

  try {
    const response = await api.patch<ApiEnvelope<Record<string, unknown>>>(
      '/api/sales/reservations',
      {
        reservationId,
        action,
        ...(extra?.assignedTableNo
          ? {assignedTableNo: extra.assignedTableNo}
          : {}),
        ...(extra?.tableId ? {tableId: extra.tableId} : {}),
      },
    );

    if (!response.data?.success || !response.data.data) {
      return {
        success: false,
        message: response.data?.message || 'Failed to update booking',
      };
    }

    return {
      success: true,
      message: response.data.message,
      data: normalizeReservation(response.data.data),
    };
  } catch (error) {
    return {
      success: false,
      message: mapReservationApiError(error, 'Failed to update booking'),
    };
  }
}

export interface FloorTableOption {
  id: string;
  tableNumber: string;
  seats: number;
  section?: string;
  floorName?: string;
  isOccupied: boolean;
  sessionId?: string | null;
}

export async function fetchFloorTables(): Promise<FloorTableOption[]> {
  if (!useLiveApi) {
    return [];
  }
  try {
    const response = await api.get<ApiEnvelope<FloorTableOption[]>>(
      '/api/sales/reservations?tables=true',
    );
    if (response.data?.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch {
    return [];
  }
}
