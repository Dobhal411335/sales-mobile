import type {OrderType} from '../navigation/types';

export interface PartyNameContext {
  orderType?: OrderType;
  isWalkIn?: boolean;
  tableLabel?: string;
  guestCount?: number;
}

export function formatTableLocation(
  tableNo?: string,
  floorName?: string,
): string {
  const table = (tableNo ?? '').trim();
  const floor = (floorName ?? '').trim();
  if (table && floor) {
    return `Table ${table} · ${floor}`;
  }
  if (table) {
    return `Table ${table}`;
  }
  if (floor) {
    return floor;
  }
  return '';
}

export function resolvePartyName(
  nameOverride: string | undefined,
  guestName: string,
  context: PartyNameContext,
): string {
  const trimmed = (nameOverride ?? guestName ?? '').trim();
  if (trimmed) {
    return trimmed;
  }

  if (context.isWalkIn || context.orderType === 'walking') {
    return 'Walk-in';
  }

  const tableLabel = context.tableLabel ?? '';
  const guestCount = context.guestCount;

  if (tableLabel && guestCount != null) {
    return `${tableLabel} · ${guestCount} guest${guestCount === 1 ? '' : 's'}`;
  }
  if (tableLabel) {
    return tableLabel;
  }
  if (guestCount != null) {
    return `${guestCount} guest${guestCount === 1 ? '' : 's'}`;
  }
  return 'Walk-in';
}

export function validatePartyEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email or leave it blank.';
  }
  return null;
}

export function validatePartyPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) {
    return 'Enter a valid phone number or leave it blank.';
  }
  return null;
}
