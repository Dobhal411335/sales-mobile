import type {DiscountCoupon, GiftCardDetails, ServiceTaxConfig} from '../types/payment';

export const MOCK_DISCOUNT_COUPONS: DiscountCoupon[] = [
  {code: 'WELCOME10', discountType: 'percent', value: 10},
  {code: 'SAVE5', discountType: 'fixed', value: 5},
  {code: 'HAPPY20', discountType: 'percent', value: 20},
];

export const MOCK_GIFT_CARDS: Record<string, GiftCardDetails> = {
  GIFT100: {code: 'GIFT100', balance: 100, status: 'ACTIVE'},
  GIFT50: {code: 'GIFT50', balance: 50, status: 'ACTIVE'},
  GIFT25: {code: 'GIFT25', balance: 25, status: 'ACTIVE'},
};

export const MOCK_SERVICE_TAX: ServiceTaxConfig = {
  name: 'Server Charge',
  type: 'percent',
  value: 3,
  active: true,
};

export function verifyMockGiftCard(code: string): GiftCardDetails | null {
  const normalized = code.trim().toUpperCase();
  return MOCK_GIFT_CARDS[normalized] ?? null;
}

export function findMockDiscount(code: string): DiscountCoupon | null {
  const normalized = code.trim().toUpperCase();
  return (
    MOCK_DISCOUNT_COUPONS.find((coupon) => coupon.code === normalized) ?? null
  );
}

export function computeDiscountAmount(
  coupon: DiscountCoupon,
  subtotal: number,
): number {
  if (coupon.discountType === 'percent') {
    return Math.round(((subtotal * coupon.value) / 100) * 100) / 100;
  }
  return Math.min(coupon.value, subtotal);
}

export function computeServiceCharge(
  subtotal: number,
  discountAmount: number,
  serviceTax: ServiceTaxConfig,
): number {
  if (!serviceTax.active) {
    return 0;
  }
  const base = Math.max(0, subtotal - discountAmount);
  if (serviceTax.type === 'percent') {
    return Math.round(((base * serviceTax.value) / 100) * 100) / 100;
  }
  return serviceTax.value;
}
