import type {ServiceTaxConfig} from '../types/payment';

export const SERVICE_CHARGE_NO_TIP_MESSAGE =
  'Service charge has already been given, so no tip is allowed.';

export function isActiveServiceTax(
  serviceTax: ServiceTaxConfig | null | undefined,
): boolean {
  return Boolean(serviceTax && serviceTax.active);
}

export function isPercentServiceTax(serviceTax: ServiceTaxConfig): boolean {
  return String(serviceTax.type || '')
    .toLowerCase()
    .includes('percent');
}

export function formatServiceTaxRate(serviceTax: ServiceTaxConfig): string {
  const value = Number(serviceTax.value) || 0;
  if (isPercentServiceTax(serviceTax)) {
    return `${value}%`;
  }
  return `$${value.toFixed(2)}`;
}

export function computeOrderServiceCharge(input: {
  serviceTax: ServiceTaxConfig | null;
  subtotal: number;
  discountAmount?: number;
}): number {
  if (!isActiveServiceTax(input.serviceTax)) {
    return 0;
  }
  const serviceTax = input.serviceTax!;
  const value = Number(serviceTax.value) || 0;
  if (isPercentServiceTax(serviceTax)) {
    const base = Math.max(
      0,
      (Number(input.subtotal) || 0) - (Number(input.discountAmount) || 0),
    );
    return Math.round((base * value) / 100 * 100) / 100;
  }
  return Math.round(value * 100) / 100;
}

export function normalizeServiceTaxFromApi(
  raw: Record<string, unknown>,
): ServiceTaxConfig | null {
  const status = String(raw.status || 'Active');
  if (status === 'Inactive') {
    return null;
  }
  const typeRaw = String(raw.type || 'Percent');
  const type = typeRaw.toLowerCase().includes('percent') ? 'percent' : 'fixed';
  return {
    name: String(raw.name || 'Server Charge'),
    type,
    value: Number(raw.value) || 0,
    active: true,
  };
}
