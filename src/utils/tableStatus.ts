import {TABLE_STATUS_STYLES, type TableStatusStyle} from '../constants/tableStatus';
import type {
  FloorTable,
  TableDisplayStatus,
  TableSession,
} from '../types/table';

export interface TableDisplayState {
  status: TableDisplayStatus;
  label: string;
  style: TableStatusStyle;
  employee: string | null;
  guests: number | null;
  sessionId: string | null;
  orderId: string | null;
}

export function findSessionForTable(
  sessions: TableSession[],
  tableId: string,
): TableSession | null {
  const id = String(tableId);
  return (
    sessions.find(
      (session) =>
        String(session.tableId) === id ||
        session.linkedTableIds.some((linkedId) => String(linkedId) === id),
    ) ?? null
  );
}

export function resolveTableDisplayStatus(
  session: TableSession | null,
  currentUserId: string | null,
): TableDisplayStatus {
  if (!session) {
    return 'AVAILABLE';
  }

  const isMine =
    Boolean(currentUserId) &&
    String(session.assignedEmployeeId) === String(currentUserId);
  const isOther = !isMine;
  const hasOrder = Boolean(session.hasActiveOrder);
  const isCombined = Boolean(session.linkedTableIds?.length);

  if (session.status === 'PAYMENT_PENDING') {
    return 'PAYMENT';
  }

  if (isOther) {
    return 'BOOKED';
  }

  if (isMine && isCombined) {
    return 'COMBINED';
  }

  if (isMine && hasOrder) {
    return 'ORDERING';
  }

  if (isMine) {
    return 'SERVING';
  }

  return 'AVAILABLE';
}

export function getTableDisplayState(
  _table: FloorTable,
  session: TableSession | null,
  currentUserId: string | null,
): TableDisplayState {
  const status = resolveTableDisplayStatus(session, currentUserId);
  const style = TABLE_STATUS_STYLES[status];

  return {
    status,
    label: style.label,
    style,
    employee: session ? getEmployeeFirstName(session.assignedEmployeeName) : null,
    guests: session ? session.guestCount : null,
    sessionId: session?.id ?? null,
    orderId: null,
  };
}

export function getEmployeeFirstName(name?: string | null): string | null {
  if (!name) {
    return null;
  }
  return name.split(' ')[0] ?? null;
}

export function isSessionOwnedByUser(
  session: TableSession | null,
  currentUserId: string | null,
): boolean {
  if (!session || !currentUserId) {
    return false;
  }
  return String(session.assignedEmployeeId) === String(currentUserId);
}

export function getTableCardSize(table: FloorTable): {
  width: number;
  height: number;
} {
  return {
    width: (table.width || 80) * 1.2,
    height: (table.height || 80) * 1.1,
  };
}
