import type {DiscountCoupon, GiftCardDetails, ServiceTaxConfig} from '../types/payment';

export const MOCK_DISCOUNT_COUPONS: DiscountCoupon[] = [
  {code: 'WELCOME10', discountType: 'percent', value: 10},
  {code: 'SAVE5', discountType: 'fixed', value: 5},
  {code: 'HAPPY20', discountType: 'percent', value: 20},
];

export const MOCK_GIFT_CARDS: Record<string, GiftCardDetails> = {
  GIFT100: {
    code: 'GIFT100',
    name: 'VIP Guest Card',
    value: 100,
    balance: 100,
    status: 'Active',
    isIssued: true,
    recipientName: 'Alex Morgan',
    recipientEmail: 'alex.morgan@example.com',
    recipientPhone: '555-0199',
    issueDate: '2026-08-01T12:00:00.000Z',
    history: [
      {
        usedAt: '2026-08-15T19:30:00.000Z',
        amountUsed: 25,
        balanceAfter: 75,
        orderNumber: '0042',
        note: 'POS Payment',
      },
    ],
  },
  GIFT50: {
    code: 'GIFT50',
    name: 'Loyalty Reward Card',
    value: 50,
    balance: 50,
    status: 'Active',
    isIssued: true,
    recipientName: 'Jamie Smith',
    recipientEmail: 'jamie.smith@example.com',
    recipientPhone: '555-0144',
    issueDate: '2026-08-10T10:00:00.000Z',
    history: [],
  },
  GIFT25: {
    code: 'GIFT25',
    name: 'Welcome Gift',
    value: 25,
    balance: 25,
    status: 'Active',
    isIssued: true,
    recipientName: 'Taylor Green',
    recipientEmail: 'taylor.g@example.com',
    recipientPhone: '555-0182',
    issueDate: '2026-08-20T14:00:00.000Z',
    history: [],
  },
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
