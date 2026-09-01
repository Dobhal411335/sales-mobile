import type {TodayOrder} from '../types/todayOrder';

export function resolveDocumentId(
  value: unknown,
): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[object Object]') {
      return null;
    }
    return trimmed;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const nested =
      (obj._id && obj._id !== value
        ? resolveDocumentId(obj._id)
        : null) ||
      (obj.id && obj.id !== value ? resolveDocumentId(obj.id) : null) ||
      (obj.$oid && obj.$oid !== value
        ? resolveDocumentId(obj.$oid)
        : null);
    if (nested) {
      return nested;
    }
    const asString = String(value);
    if (asString && asString !== '[object Object]') {
      return asString;
    }
    return null;
  }
  const asString = String(value);
  if (!asString || asString === '[object Object]') {
    return null;
  }
  return asString;
}

export function isDirectSaleOrder(order: TodayOrder): boolean {
  const source = order?.source;
  return source === 'WALK_IN' || source === 'STAFF';
}

function stripFloorSuffix(value: string) {
  const text = String(value ?? '').trim();
  const separator = text.lastIndexOf(' · ');
  if (separator === -1) {
    return {tables: text, floor: ''};
  }
  return {
    tables: text.slice(0, separator).trim(),
    floor: text.slice(separator + 3).trim(),
  };
}

function normalizeTableToken(value: string) {
  return String(value ?? '')
    .trim()
    .replace(/^(tables?|tbl)\s+/i, '')
    .trim();
}

export function joinTableNumbers(numbers: Array<string | null | undefined>) {
  const tokens: string[] = [];
  for (const value of numbers || []) {
    const raw = String(value ?? '').trim();
    if (!raw) {
      continue;
    }
    const {tables} = stripFloorSuffix(raw);
    for (const part of tables.split(/\s*,\s*/)) {
      const token = normalizeTableToken(part);
      if (token) {
        tokens.push(token);
      }
    }
  }
  const unique = [...new Set(tokens)];
  unique.sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ''), 10);
    const nb = parseInt(String(b).replace(/\D/g, ''), 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) {
      return na - nb;
    }
    return String(a).localeCompare(String(b), undefined, {numeric: true});
  });
  return unique.join(', ');
}

export function formatTableNumbersWithFloor(
  tableNo?: string,
  floorName?: string,
) {
  const parsed = stripFloorSuffix(tableNo ?? '');
  const numbers = joinTableNumbers([parsed.tables || tableNo]);
  const floor = String(floorName || parsed.floor || '').trim();
  if (!numbers) {
    return floor;
  }
  if (!floor) {
    return numbers;
  }
  if (numbers.toLowerCase().includes(floor.toLowerCase())) {
    return numbers;
  }
  return `${numbers} · ${floor}`;
}

export function formatTableLocation(tableNo?: string, floorName?: string) {
  const body = formatTableNumbersWithFloor(tableNo, floorName);
  if (!body) {
    return '';
  }
  if (/^tables?\b/i.test(body)) {
    return body.replace(/^tables?\b/i, 'Table');
  }
  const numbers = joinTableNumbers([tableNo]);
  if (!numbers) {
    return body;
  }
  return `Table ${body}`;
}

export function shouldShowTable(order: TodayOrder): boolean {
  return Boolean(order?.tableNo) && !isDirectSaleOrder(order);
}

export function getOrderTypeLabel(order: TodayOrder): string {
  const source = order?.source || 'POS';
  if (source === 'WALK_IN') {
    return 'Walk-in';
  }
  if (source === 'STAFF') {
    return 'Staff';
  }
  if (source === 'ONLINE') {
    return 'Online';
  }
  if (order?.tableSession || order?.tableNo) {
    return 'Table Order';
  }
  return 'Takeaway';
}

export type OrderTypeBadgeVariant =
  | 'walkin'
  | 'staff'
  | 'online'
  | 'table'
  | 'default';

export function getOrderTypeBadgeVariant(order: TodayOrder): OrderTypeBadgeVariant {
  const source = order?.source || 'POS';
  if (source === 'WALK_IN') {
    return 'walkin';
  }
  if (source === 'STAFF') {
    return 'staff';
  }
  if (source === 'ONLINE') {
    return 'online';
  }
  if (order?.tableSession || order?.tableNo) {
    return 'table';
  }
  return 'default';
}

export function getOrderLocationLabel(order: TodayOrder): string {
  if (order?.source === 'WALK_IN') {
    return order?.partyName || order?.guestName || 'Walk-in';
  }
  if (order?.source === 'STAFF') {
    return order?.partyName || order?.guestName || 'Staff';
  }
  if (order?.tableNo) {
    return formatTableLocation(
      order.tableNo,
      order.floorName || order.floor?.name,
    );
  }
  if (order?.tableSession) {
    return 'Table';
  }
  return 'Takeaway';
}

export function getOrderPartyLabel(order: TodayOrder): string | null {
  const party = (order?.partyName || order?.guestName || '').trim();
  if (!party) {
    return null;
  }
  if (order?.source === 'WALK_IN' && party === 'Walk-in') {
    return null;
  }
  if (order?.source === 'STAFF' && party === getOrderLocationLabel(order)) {
    return null;
  }
  return party;
}

export function getPlacerName(order: TodayOrder): string | null {
  if (order.processedByName) {
    return order.processedByName;
  }
  const p = order.processedBy;
  if (p && typeof p === 'object') {
    return (
      p.name ||
      [p.firstName, p.lastName].filter(Boolean).join(' ') ||
      null
    );
  }
  return null;
}

export function getOrderSessionId(order: TodayOrder): string | null {
  const session = order?.tableSession;
  if (!session) {
    return null;
  }
  if (typeof session === 'object') {
    return session._id || session.id || null;
  }
  return session;
}
