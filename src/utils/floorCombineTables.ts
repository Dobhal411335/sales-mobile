import type {FloorTable, TableSession} from '../types/table';
import {findSessionForTable} from './tableStatus';

export interface CombineTableGroups {
  available: FloorTable[];
  mine: FloorTable[];
}

export function sumSeatsForTables(
  tables: FloorTable[],
  tableIds: string[],
): number {
  const idSet = new Set((tableIds || []).map((id) => String(id)));
  return tables.reduce((sum, table) => {
    if (!idSet.has(String(table.id))) {
      return sum;
    }
    return sum + (Number(table.seats) || 0);
  }, 0);
}

export function buildCombineGroups(
  tables: FloorTable[],
  sessions: TableSession[],
  primaryTableId: string,
  ownerId: string | null,
  activeSession?: TableSession | null,
): CombineTableGroups {
  const available: FloorTable[] = [];
  const mine: FloorTable[] = [];
  const primaryId = String(primaryTableId || '');

  if (!primaryId) {
    return {available, mine};
  }

  for (const table of tables) {
    const tableId = String(table.id);
    if (tableId === primaryId) {
      continue;
    }

    const session = findSessionForTable(sessions, tableId);
    if (!session) {
      available.push(table);
      continue;
    }

    const isThisSession =
      activeSession != null && String(session.id) === String(activeSession.id);
    const isMine =
      ownerId != null && String(session.assignedEmployeeId) === String(ownerId);

    if (isThisSession || isMine) {
      mine.push(table);
    }
  }

  return {available, mine};
}

export function getSiblingLinkedTableIds(
  sessions: TableSession[],
  tableId: string,
  primaryTableId: string,
): string[] {
  const session = findSessionForTable(sessions, tableId);
  if (!session) {
    return [];
  }

  const primaryId = String(primaryTableId || '');
  const siblingIds = [
    session.tableId,
    ...(session.linkedTableIds || []),
  ]
    .map((id) => String(id))
    .filter((id) => id && id !== primaryId);

  return siblingIds;
}

export function toggleLinkedTableIds(
  selectedIds: string[],
  tableId: string,
  extraIds: string[],
  primaryTableId: string,
): string[] {
  const primaryId = String(primaryTableId || '');
  const idsToToggle = [String(tableId), ...extraIds.map(String)];
  const next = new Set(selectedIds.map(String));

  const shouldSelect = idsToToggle.some((id) => !next.has(id));
  idsToToggle.forEach((id) => {
    if (!id || id === primaryId) {
      return;
    }
    if (shouldSelect) {
      next.add(id);
    } else {
      next.delete(id);
    }
  });

  return [...next];
}

export function formatTableLocation(
  tableNumbers?: string | null,
  floorName?: string | null,
): string {
  const tables = tableNumbers?.trim();
  if (tables && floorName) {
    return `${tables} · ${floorName}`;
  }
  return tables || floorName || 'Table';
}

export function getOpenDurationMinutes(openedAt?: string | null): number {
  if (!openedAt) {
    return 0;
  }
  const opened = new Date(openedAt).getTime();
  if (!Number.isFinite(opened)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - opened) / 60000));
}
