import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import type {Floor, FloorData, FloorTable, TableSession} from '../types/table';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapFloorApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
      return "You don't have permission to view the floor.";
    }
    if (status === 404) {
      return 'Floor or table no longer exists.';
    }
    if (status && status >= 500) {
      return 'Server error. Please try again.';
    }
    if (!error.response) {
      return 'Unable to load floor. Check your connection and try again.';
    }
  }
  return 'Unable to load floor. Check your connection and try again.';
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

function normalizeTable(raw: Record<string, unknown>): FloorTable {
  return {
    id: toId(raw.id ?? raw._id),
    tableNumber: String(raw.tableNumber ?? ''),
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    width: Number(raw.width) || 80,
    height: Number(raw.height) || 80,
    rotation: Number(raw.rotation) || 0,
    shape: (raw.shape as FloorTable['shape']) || 'square',
    seats: Number(raw.seats) || 0,
    section: raw.section ? String(raw.section) : undefined,
  };
}

function normalizeSession(raw: Record<string, unknown>): TableSession {
  const linkedTableIds = Array.isArray(raw.linkedTableIds)
    ? raw.linkedTableIds.map((id) => toId(id))
    : [];

  return {
    id: toId(raw.id ?? raw._id),
    sessionId: raw.sessionId ? String(raw.sessionId) : undefined,
    tableId: toId(raw.tableId),
    linkedTableIds,
    tableNumbers: raw.tableNumbers ? String(raw.tableNumbers) : undefined,
    assignedEmployeeId: raw.assignedEmployeeId
      ? toId(raw.assignedEmployeeId)
      : undefined,
    assignedEmployeeName: raw.assignedEmployeeName
      ? String(raw.assignedEmployeeName)
      : undefined,
    guestCount: Number(raw.guestCount) || 0,
    effectiveSeatCount: raw.effectiveSeatCount
      ? Number(raw.effectiveSeatCount)
      : undefined,
    status: raw.status ? String(raw.status) : undefined,
    openedAt: raw.openedAt ? String(raw.openedAt) : undefined,
    hasActiveOrder: Boolean(raw.hasActiveOrder),
    orderTakerName:
      raw.orderTakerName != null ? String(raw.orderTakerName) : null,
  };
}

function normalizeFloor(raw: Record<string, unknown>): Floor {
  return {
    id: toId(raw.id ?? raw._id),
    name: String(raw.name ?? ''),
    width: Number(raw.width) || 1200,
    height: Number(raw.height) || 800,
  };
}

export function normalizeFloorData(raw: Record<string, unknown>): FloorData {
  const floors = Array.isArray(raw.floors)
    ? raw.floors.map((floor) =>
        normalizeFloor(floor as Record<string, unknown>),
      )
    : [];
  const tables = Array.isArray(raw.tables)
    ? raw.tables.map((table) =>
        normalizeTable(table as Record<string, unknown>),
      )
    : [];
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.map((session) =>
        normalizeSession(session as Record<string, unknown>),
      )
    : [];

  return {
    floors,
    activeFloorId: toId(raw.activeFloorId),
    tables,
    sessions,
  };
}

export function isFloorApiConfigured(): boolean {
  return useLiveApi;
}

export async function fetchFloorData(floorId?: string): Promise<FloorData> {
  if (!useLiveApi) {
    throw new Error('API not configured');
  }

  try {
    const response = await api.get<ApiEnvelope<Record<string, unknown>>>(
      '/api/sales/floor',
      {
        params: floorId ? {floorId} : undefined,
      },
    );

    if (!response.data?.success || !response.data.data) {
      throw new Error(response.data?.message || 'Failed to load floor data');
    }

    return normalizeFloorData(response.data.data);
  } catch (error) {
    throw new Error(mapFloorApiError(error));
  }
}
