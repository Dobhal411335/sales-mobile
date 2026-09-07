import {colors} from '../constants/colors';
import type {TodayOrder, TodayOrderStatus} from '../types/todayOrder';

export const TODAY_ORDER_FILTERS = [
  'All',
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'WAIVED',
  'PAID',
  'ONLINE',
] as const;

export const STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  COMPLETED: 2,
  PAID: 2,
  WAIVED: 3,
  CANCELLED: 4,
};

export function getOrderGrandTotal(order: TodayOrder): number {
  return Number(order?.totalAmount || 0) + Number(order?.tipAmount || 0);
}

export function isOrderPaid(order: TodayOrder): boolean {
  return order?.paymentStatus === 'PAID' || order?.status === 'PAID';
}

export interface PaymentTypeInfo {
  label: string;
  variant: 'unpaid' | 'waived' | 'card' | 'cash' | 'gift' | 'combo' | 'other';
}

export interface ParsedPaymentDetails {
  label: string;
  shortLabel: string;
  variant: 'unpaid' | 'waived' | 'card' | 'cash' | 'gift' | 'combo' | 'other';
  hasCash: boolean;
  hasCard: boolean;
  hasGift: boolean;
  cardBrand: string | null;
  displayBreakdown?: string;
}

export function parsePaymentDetails(
  order?: Partial<TodayOrder> | null,
): ParsedPaymentDetails {
  const status = String(order?.status || '').toUpperCase();
  const paymentStatus = String(order?.paymentStatus || '').toUpperCase();

  if (status === 'WAIVED' || paymentStatus === 'WAIVED') {
    return {
      label: 'Waived',
      shortLabel: 'Waived',
      variant: 'waived',
      hasCash: false,
      hasCard: false,
      hasGift: false,
      cardBrand: null,
    };
  }

  const rawMethod = String(order?.paymentMethod || '').trim();
  const lower = rawMethod.toLowerCase();
  const giftAmount = Number(order?.giftcardUsedAmount || 0);
  const usedGiftCard = giftAmount > 0 || Boolean(order?.giftcardCode);

  const isPaid = paymentStatus === 'PAID' || status === 'PAID';
  if ((!rawMethod || lower === 'unpaid') && !usedGiftCard && !isPaid) {
    return {
      label: 'Unpaid',
      shortLabel: 'Unpaid',
      variant: 'unpaid',
      hasCash: false,
      hasCard: false,
      hasGift: false,
      cardBrand: null,
    };
  }

  // 1. Detect Gift Card
  const hasGift = usedGiftCard || /\bgift\b/i.test(lower);

  // 2. Detect Cash
  const cashAmount =
    order?.cashAmount != null ? Number(order.cashAmount) : null;
  const hasCash =
    (cashAmount != null && cashAmount > 0) || /\bcash\b/i.test(lower);

  // 3. Detect Card (ignore "card" if strictly inside "gift card")
  const methodWithoutGift = lower
    .replace(/gift\s*card/gi, '')
    .replace(/\bgift\b/gi, '');
  const cardAmount =
    order?.cardAmount != null ? Number(order.cardAmount) : null;
  const hasCard =
    (cardAmount != null && cardAmount > 0) ||
    /\bcard\b/i.test(methodWithoutGift) ||
    /\b(visa|mastercard|amex|discover|debit|interac)\b/i.test(lower);

  // 4. Extract Card Brand
  let cardBrand: string | null = null;
  if (hasCard) {
    const brandMatch = rawMethod.match(
      /\b(visa|mastercard|amex|discover|debit|interac)\b/i,
    );
    if (brandMatch) {
      const b = brandMatch[1].toLowerCase();
      if (b === 'visa') cardBrand = 'Visa';
      else if (b === 'mastercard') cardBrand = 'Mastercard';
      else if (b === 'amex') cardBrand = 'Amex';
      else if (b === 'discover') cardBrand = 'Discover';
      else if (b === 'debit') cardBrand = 'Debit';
      else if (b === 'interac') cardBrand = 'Interac';
    } else {
      const dashMatch = rawMethod.match(/card\s*[-·:]\s*([A-Za-z0-9]+)/i);
      if (dashMatch && dashMatch[1]) {
        const val = dashMatch[1].trim();
        if (!/^(cash|gift|card)$/i.test(val)) {
          cardBrand = val;
        }
      }
    }
  }

  // Build tender amounts breakdown if specific amounts exist
  const partsWithAmounts: string[] = [];
  if (hasGift && giftAmount > 0) {
    partsWithAmounts.push(`Gift Card: $${giftAmount.toFixed(2)}`);
  }
  if (hasCard && cardAmount != null && cardAmount > 0) {
    partsWithAmounts.push(
      `${cardBrand ? `Card (${cardBrand})` : 'Card'}: $${cardAmount.toFixed(2)}`,
    );
  }
  if (hasCash && cashAmount != null && cashAmount > 0) {
    partsWithAmounts.push(`Cash: $${cashAmount.toFixed(2)}`);
  }
  const displayBreakdown =
    partsWithAmounts.length > 1 ? partsWithAmounts.join(' · ') : undefined;

  // Case A: Triple Split (Gift + Card + Cash)
  if (hasGift && hasCard && hasCash) {
    return {
      label: 'Gift + Card + Cash',
      shortLabel: 'Gift + Split',
      variant: 'combo',
      hasCash,
      hasCard,
      hasGift,
      cardBrand,
      displayBreakdown,
    };
  }

  // Case B: Split Gift + Card
  if (hasGift && hasCard) {
    const cardPart = cardBrand ? `Card (${cardBrand})` : 'Card';
    return {
      label: `Gift + ${cardPart}`,
      shortLabel: 'Gift + Card',
      variant: 'combo',
      hasCash,
      hasCard,
      hasGift,
      cardBrand,
      displayBreakdown,
    };
  }

  // Case C: Split Gift + Cash
  if (hasGift && hasCash) {
    return {
      label: 'Gift + Cash',
      shortLabel: 'Gift + Cash',
      variant: 'combo',
      hasCash,
      hasCard,
      hasGift,
      cardBrand,
      displayBreakdown,
    };
  }

  // Case D: Gift Card Only
  if (hasGift) {
    return {
      label: 'Gift Card',
      shortLabel: 'Gift Card',
      variant: 'gift',
      hasCash,
      hasCard,
      hasGift,
      cardBrand,
      displayBreakdown,
    };
  }

  // Case E: Split Card + Cash
  if (hasCard && hasCash) {
    const cardPart = cardBrand ? `Card (${cardBrand})` : 'Card';
    return {
      label: `${cardPart} + Cash`,
      shortLabel: 'Card + Cash',
      variant: 'card',
      hasCash,
      hasCard,
      hasGift,
      cardBrand,
      displayBreakdown,
    };
  }

  // Case F: Card Only
  if (hasCard) {
    return {
      label: cardBrand ? `Card · ${cardBrand}` : 'Card',
      shortLabel: cardBrand || 'Card',
      variant: 'card',
      hasCash,
      hasCard,
      hasGift,
      cardBrand,
      displayBreakdown,
    };
  }

  // Case G: Cash Only
  if (hasCash) {
    return {
      label: 'Cash',
      shortLabel: 'Cash',
      variant: 'cash',
      hasCash,
      hasCard,
      hasGift,
      cardBrand,
      displayBreakdown,
    };
  }

  // Fallback cleanup
  let fallbackLabel = rawMethod || 'Other';
  if (/cash/i.test(fallbackLabel) && /card/i.test(fallbackLabel)) {
    fallbackLabel = 'Card + Cash';
  }

  return {
    label: fallbackLabel,
    shortLabel: fallbackLabel,
    variant: 'other',
    hasCash: false,
    hasCard: false,
    hasGift: false,
    cardBrand: null,
    displayBreakdown,
  };
}

export function getPaymentType(order: TodayOrder): PaymentTypeInfo {
  const parsed = parsePaymentDetails(order);
  return {
    label: parsed.label,
    variant: parsed.variant,
  };
}

export function getStatusColors(status?: TodayOrderStatus | string) {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return {bg: '#FEF3C7', text: '#B45309'};
    case 'CONFIRMED':
    case 'COMPLETED':
      return {bg: '#D1FAE5', text: '#047857'};
    case 'CANCELLED':
      return {bg: '#FEE2E2', text: '#B91C1C'};
    case 'WAIVED':
      return {bg: '#F1F5F9', text: '#334155'};
    case 'PAID':
      return {bg: '#DBEAFE', text: '#1D4ED8'};
    default:
      return {bg: '#F4F4F5', text: '#3F3F46'};
  }
}

export function getPaymentStatusColors(paymentStatus?: string) {
  switch (paymentStatus?.toUpperCase()) {
    case 'PAID':
      return {bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0'};
    case 'PARTIAL':
      return {bg: '#FEF3C7', text: '#92400E', border: '#FDE68A'};
    case 'REFUNDED':
      return {bg: '#FEE2E2', text: '#991B1B', border: '#FECACA'};
    default:
      return {bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3'};
  }
}

export function getPaymentBadgeColors(variant: PaymentTypeInfo['variant']) {
  switch (variant) {
    case 'unpaid':
      return {bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3'};
    case 'waived':
      return {bg: '#F1F5F9', text: '#334155', border: '#E2E8F0'};
    case 'card':
      return {bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD'};
    case 'cash':
      return {bg: '#D1FAE5', text: '#047857', border: '#A7F3D0'};
    case 'gift':
    case 'combo':
      return {bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE'};
    default:
      return {bg: '#F4F4F5', text: '#3F3F46', border: colors.border};
  }
}

export function getOrderTypeBadgeColors(variant: string) {
  switch (variant) {
    case 'walkin':
      return {bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA'};
    case 'staff':
      return {bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE'};
    case 'online':
      return {bg: '#E0F2FE', text: '#075985', border: '#BAE6FD'};
    case 'table':
      return {bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0'};
    default:
      return {bg: '#F4F4F5', text: '#3F3F46', border: colors.border};
  }
}

export function canPayTodayOrder(order: TodayOrder): boolean {
  const isOnline = order?.source === 'ONLINE';
  const orderStatusUpper = String(order?.status || '').toUpperCase();
  return (
    !isOnline &&
    !isOrderPaid(order) &&
    ['PENDING', 'CONFIRMED'].includes(orderStatusUpper)
  );
}

export function canWaiveOrder(order: TodayOrder): boolean {
  return canPayTodayOrder(order);
}

export function getEmptyFilterMessage(filter: string): string {
  switch (filter) {
    case 'PENDING':
      return 'No pending orders today.';
    case 'CONFIRMED':
      return 'No confirmed orders today.';
    case 'CANCELLED':
      return 'No cancelled orders today.';
    case 'WAIVED':
      return 'No waived orders today.';
    case 'PAID':
      return 'No paid orders today.';
    case 'ONLINE':
      return 'No online orders today.';
    default:
      return 'Orders placed today will appear here.';
  }
}
