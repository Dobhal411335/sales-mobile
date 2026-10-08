/**
 * Per-seat ordering helpers (mirrors Web/src/lib/orders/seatHelpers.js).
 */

import {getItemLineTotal} from './productChoices';

export function normalizeSeatNumber(value: unknown): number | null {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 'table'
  ) {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.floor(n);
}

export function seatNumbersEqual(a: unknown, b: unknown): boolean {
  return normalizeSeatNumber(a) === normalizeSeatNumber(b);
}

export function formatSeatLabel(seatNumber: unknown): string {
  const n = normalizeSeatNumber(seatNumber);
  return n == null ? 'Table' : `Seat ${n}`;
}

export type SeatAccordionStyle = {
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
};

/** Header colors for Table + Seat accordions (cycles after Seat 4). */
export const SEAT_ACCORDION_STYLES: SeatAccordionStyle[] = [
  {
    headerBg: '#F97316',
    headerText: '#FFFFFF',
    badgeBg: 'rgba(255,255,255,0.22)',
    badgeText: '#FFFFFF',
  },
  {
    headerBg: '#9CA36A',
    headerText: '#FFFFFF',
    badgeBg: 'rgba(255,255,255,0.22)',
    badgeText: '#FFFFFF',
  },
  {
    headerBg: '#2DD4BF',
    headerText: '#FFFFFF',
    badgeBg: 'rgba(255,255,255,0.25)',
    badgeText: '#FFFFFF',
  },
  {
    headerBg: '#94A3B8',
    headerText: '#FFFFFF',
    badgeBg: 'rgba(255,255,255,0.25)',
    badgeText: '#FFFFFF',
  },
  {
    headerBg: '#8B5CF6',
    headerText: '#FFFFFF',
    badgeBg: 'rgba(255,255,255,0.22)',
    badgeText: '#FFFFFF',
  },
];

export function getSeatAccordionStyle(
  seatNumber: number | null,
): SeatAccordionStyle {
  if (seatNumber == null) {
    return SEAT_ACCORDION_STYLES[0];
  }
  const idx = ((Math.floor(seatNumber) - 1) % 4) + 1;
  return SEAT_ACCORDION_STYLES[idx] ?? SEAT_ACCORDION_STYLES[1];
}

export function formatSeatAccordionLabel(seatNumber: number | null): string {
  if (seatNumber == null) {
    return 'Table';
  }
  return `Seat ${String(seatNumber).padStart(2, '0')}`;
}

export function groupItemsBySeat<T extends {seatNumber?: number | null; seat?: unknown}>(
  items: T[] = [],
): Array<{seatNumber: number | null; label: string; items: T[]}> {
  const map = new Map<string, {seatNumber: number | null; label: string; items: T[]}>();
  for (const item of items) {
    const seat = normalizeSeatNumber(item?.seatNumber ?? item?.seat);
    const key = seat == null ? 'table' : String(seat);
    if (!map.has(key)) {
      map.set(key, {
        seatNumber: seat,
        label: formatSeatLabel(seat),
        items: [],
      });
    }
    map.get(key)!.items.push(item);
  }

  const numbered = [...map.values()]
    .filter((g) => g.seatNumber != null)
    .sort((a, b) => (a.seatNumber as number) - (b.seatNumber as number));
  const table = map.get('table');
  return table ? [...numbered, table] : numbered;
}

export function buildSeatSplitRows(order: {
  items?: Array<{
    price?: number;
    qty?: number;
    customExtras?: Array<{price?: number}>;
    seatNumber?: number | null;
    seat?: unknown;
  }>;
  totalAmount?: number;
  taxTotal?: number;
  serviceChargeTotal?: number;
  discountTotal?: number;
  giftcardUsedAmount?: number;
}): Array<{
  seatNumber: number | null;
  name: string;
  amount: number;
  method: string;
  tipAmount: number;
}> {
  const items = Array.isArray(order?.items) ? order.items : [];
  const groups = groupItemsBySeat(items);
  if (!groups.length) {
    return [];
  }

  const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

  const buckets = groups.map((g) => ({
    seatNumber: g.seatNumber,
    name: formatSeatLabel(g.seatNumber),
    subtotal: r2(g.items.reduce((s, it) => s + getItemLineTotal(it), 0)),
  }));

  const orderSub = buckets.reduce((s, b) => s + b.subtotal, 0) || 1;
  const taxTotal = Number(order?.taxTotal) || 0;
  const serviceChargeTotal = Number(order?.serviceChargeTotal) || 0;
  const discountTotal = Number(order?.discountTotal) || 0;
  const giftcardUsed = Number(order?.giftcardUsedAmount) || 0;
  const totalAmount = Number(order?.totalAmount);
  const due =
    Number.isFinite(totalAmount) && totalAmount >= 0
      ? r2(totalAmount)
      : r2(orderSub + taxTotal + serviceChargeTotal - discountTotal - giftcardUsed);

  const rows = buckets.map((b) => ({
    seatNumber: b.seatNumber,
    name: b.name,
    amount: r2(due * (b.subtotal / orderSub)),
    method: 'Card',
    tipAmount: 0,
  }));

  if (rows.length) {
    const sumExceptLast = rows.slice(0, -1).reduce((s, r) => s + r.amount, 0);
    rows[rows.length - 1].amount = r2(Math.max(0, due - sumExceptLast));
  }

  return rows;
}

/** True when payment splits align with seat buckets (split-by-seat checkout). */
export function isSeatBasedPaymentSplits(
  splits: Array<{name?: string; seatNumber?: number | null}> = [],
  items: Array<{seatNumber?: number | null; seat?: unknown}> = [],
): boolean {
  if (!Array.isArray(splits) || splits.length < 2) {
    return false;
  }
  const groups = groupItemsBySeat(items);
  if (groups.length < 2) {
    return false;
  }
  const labels = new Set(groups.map((g) => g.label));
  if (labels.size !== splits.length) {
    return false;
  }
  return splits.every((s) => labels.has(String(s?.name || '').trim()));
}

/** Items belonging to one seat bucket (null = shared Table items). */
export function filterItemsBySeat<
  T extends {seatNumber?: number | null; seat?: unknown},
>(items: T[] = [], seatNumber: number | null | undefined): T[] {
  const target = normalizeSeatNumber(seatNumber);
  return (Array.isArray(items) ? items : []).filter(
    (item) => normalizeSeatNumber(item?.seatNumber ?? item?.seat) === target,
  );
}

/** Items belonging to any of the given seat buckets. */
export function filterItemsBySeats<
  T extends {seatNumber?: number | null; seat?: unknown},
>(items: T[] = [], seatNumbers: unknown[] = []): T[] {
  const targets = new Set(
    (Array.isArray(seatNumbers) ? seatNumbers : []).map((n) => {
      const seat = normalizeSeatNumber(n);
      return seat == null ? 'table' : String(seat);
    }),
  );
  if (!targets.size) {
    return [];
  }
  return (Array.isArray(items) ? items : []).filter((item) => {
    const seat = normalizeSeatNumber(item?.seatNumber ?? item?.seat);
    const key = seat == null ? 'table' : String(seat);
    return targets.has(key);
  });
}

export function formatMergedSeatLabel(seatNumbers: unknown[] = []): string {
  const seats = (Array.isArray(seatNumbers) ? seatNumbers : []).map((n) =>
    normalizeSeatNumber(n),
  );
  if (!seats.length) {
    return 'Seats';
  }
  const numbered = seats
    .filter((n): n is number => n != null)
    .sort((a, b) => a - b);
  const hasTable = seats.some((n) => n == null);
  const parts: string[] = [];
  if (numbered.length) {
    parts.push(`Seat ${numbered.join('+')}`);
  }
  if (hasTable) {
    parts.push('Table');
  }
  return parts.join(' + ') || 'Seats';
}

/**
 * Whether a split receipt should list only one seat's lines (preview + print).
 * Uses job metadata when present; otherwise matches order.paymentSplits by splitIndex.
 */
export function resolveSplitReceiptSeatFilter(
  jobMetadata: Record<string, unknown> | null | undefined,
  order?: {
    items?: Array<{seatNumber?: number | null; seat?: unknown}>;
    paymentSplits?: Array<{
      name?: string;
      seatNumber?: number | null;
    }>;
  } | null,
): {filter: boolean; seatNumber: number | null} {
  const meta =
    jobMetadata && typeof jobMetadata === 'object' ? jobMetadata : {};
  if (meta.filterReceiptBySeat) {
    return {
      filter: true,
      seatNumber:
        meta.splitSeatNumber !== undefined && meta.splitSeatNumber !== null
          ? normalizeSeatNumber(meta.splitSeatNumber)
          : null,
    };
  }
  if (!meta.isSplitReceipt || !order) {
    return {filter: false, seatNumber: null};
  }
  const splits = order.paymentSplits;
  if (!isSeatBasedPaymentSplits(splits || [], order.items || [])) {
    return {filter: false, seatNumber: null};
  }
  const idx = Math.max(0, (Number(meta.splitIndex) || 1) - 1);
  const split = splits?.[idx];
  if (!split) {
    return {filter: false, seatNumber: null};
  }
  return {
    filter: true,
    seatNumber: normalizeSeatNumber(split.seatNumber),
  };
}

/** Scale order totals by filtered items' share of line subtotal. */
export function proportionalOrderTotalsForItems(
  order: {
    items?: Array<{
      price?: number;
      qty?: number;
      customExtras?: Array<{price?: number}>;
    }>;
    discountTotal?: number;
    taxTotal?: number;
    serviceChargeTotal?: number;
    totalAmount?: number;
    taxBreakdown?: Array<{
      name?: string;
      amount?: number;
      rate?: number;
      taxId?: string;
    }>;
  } | null | undefined,
  filteredItems: Array<{
    price?: number;
    qty?: number;
    customExtras?: Array<{price?: number}>;
  }> = [],
): {
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceChargeTotal: number;
  totalAmount: number;
  taxBreakdown: Array<{
    name?: string;
    amount: number;
    rate?: number;
    taxId?: string;
  }>;
} {
  const allItems = Array.isArray(order?.items) ? order.items : [];
  const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
  const orderSub = allItems.reduce((s, it) => s + getItemLineTotal(it), 0);
  const seatSub = (Array.isArray(filteredItems) ? filteredItems : []).reduce(
    (s, it) => s + getItemLineTotal(it),
    0,
  );
  const ratio = orderSub > 0 ? seatSub / orderSub : 1;
  const taxBreakdown = (
    Array.isArray(order?.taxBreakdown) ? order.taxBreakdown : []
  ).map((t) => ({
    ...t,
    amount: r2(Number(t.amount || 0) * ratio),
  }));
  return {
    subTotal: r2(seatSub),
    discountTotal: r2(Number(order?.discountTotal || 0) * ratio),
    taxTotal: r2(Number(order?.taxTotal || 0) * ratio),
    serviceChargeTotal: r2(Number(order?.serviceChargeTotal || 0) * ratio),
    totalAmount: r2(Number(order?.totalAmount || 0) * ratio),
    taxBreakdown,
  };
}
