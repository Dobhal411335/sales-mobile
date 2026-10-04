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
