export const STAFF_DISCOUNT_CODE = 'STAFF';

export function normalizeStaffDiscountPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return 0;
  }
  return Math.min(100, n);
}

export function calcStaffDiscountAmount(subTotal: number, percent: number): number {
  const pct = normalizeStaffDiscountPercent(percent);
  if (pct <= 0) {
    return 0;
  }
  return Math.round(((Number(subTotal) || 0) * pct) / 100 * 100) / 100;
}

export function buildStaffDiscountState(
  percent: number,
  employeeName?: string,
): {
  code: string;
  value: number;
  type: 'percent';
  label: string;
} | null {
  const value = normalizeStaffDiscountPercent(percent);
  if (value <= 0) {
    return null;
  }
  return {
    code: STAFF_DISCOUNT_CODE,
    value,
    type: 'percent',
    label: employeeName
      ? `${employeeName} · ${value}% staff`
      : `Staff ${value}%`,
  };
}
