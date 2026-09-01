import type {AppliedDiscount} from './cart';
import type {PaidOrderSnapshot} from './receipt';

export type PaymentMethodKey = 'Card' | 'Cash' | 'GiftCard';

export type CardTypeName =
  | 'Visa'
  | 'Mastercard'
  | 'RuPay'
  | 'Amex'
  | 'Discover';

export type PaymentUiStatus =
  | 'default'
  | 'method_selected'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled';

export interface DiscountCoupon {
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
  label?: string;
}

export interface GiftCardDetails {
  code: string;
  balance: number;
  status?: string;
}

export interface ServiceTaxConfig {
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
}

export interface PaymentRequestPayload {
  orderId: string;
  sessionId?: string;
  paymentMethod: string;
  cardType?: CardTypeName;
  cashAmount?: number;
  cardAmount?: number;
  giftcardCode?: string;
  giftcardUsedAmount?: number;
  tipAmount?: number;
  tipMethod?: string;
  discountCode?: string;
  serviceChargeTotal?: number;
  serviceChargeName?: string;
  guestName?: string;
}

export interface PaymentProcessResult {
  success: boolean;
  message?: string;
  order?: PaidOrderSnapshot;
}

export interface AppliedPaymentDiscount {
  code: string;
  type: 'percent' | 'fixed' | 'dollar';
  value: number;
}

export function toAppliedDiscount(
  discount: AppliedPaymentDiscount | null,
): AppliedDiscount | null {
  if (!discount) {
    return null;
  }
  if (discount.type === 'percent') {
    return {code: discount.code, type: 'percent', value: discount.value};
  }
  return {code: discount.code, type: 'fixed', value: discount.value};
}
