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

export function getPaymentType(order: TodayOrder): PaymentTypeInfo {
  if (String(order?.status || '').toUpperCase() === 'WAIVED') {
    return {label: 'Waived', variant: 'waived'};
  }

  const method = String(order?.paymentMethod || '').trim();
  const usedGiftCard =
    Number(order?.giftcardUsedAmount || 0) > 0 || Boolean(order?.giftcardCode);
  const lower = method.toLowerCase();

  if (!method && !usedGiftCard) {
    return {label: 'Unpaid', variant: 'unpaid'};
  }

  const isCard = lower.includes('card') && !lower.includes('gift');
  const isCash = lower.includes('cash');
  const isGift = lower.includes('gift');

  if (usedGiftCard && (isCard || isCash)) {
    const cardType = method.replace(/^Card\s*-?\s*/i, '').trim();
    const other = isCard
      ? cardType && cardType.toLowerCase() !== 'card'
        ? `Card · ${cardType}`
        : 'Card'
      : 'Cash';
    return {label: `Gift + ${other}`, variant: 'combo'};
  }

  if (isGift || (usedGiftCard && !isCard && !isCash)) {
    return {label: 'Gift Card', variant: 'gift'};
  }

  if (isCard) {
    const cardType = method.replace(/^Card\s*-\s*/i, '').trim();
    return {
      label:
        cardType && cardType.toLowerCase() !== 'card'
          ? `Card · ${cardType}`
          : 'Card',
      variant: 'card',
    };
  }

  if (isCash) {
    return {label: 'Cash', variant: 'cash'};
  }

  return {label: method, variant: 'other'};
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

export function canWaiveOrder(order: TodayOrder): boolean {
  const isOnline = order?.source === 'ONLINE';
  const orderStatusUpper = String(order?.status || '').toUpperCase();
  return (
    !isOnline &&
    !isOrderPaid(order) &&
    ['PENDING', 'CONFIRMED'].includes(orderStatusUpper)
  );
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
