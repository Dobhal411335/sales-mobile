import type {
  FloorTable,
  TableDisplayStatus,
  TableSession,
} from '../types/table';

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
