import type {AppliedDiscount, CartLineItem} from './cart';
import type {PaidOrderSnapshot, ReceiptOrder, TaxBreakdownLine} from './receipt';

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
  amount: number;
  method: string;
  sessionId?: string;
  tipAmount?: number;
  tipMethod?: string | null;
  cardType?: CardTypeName;
  giftCardCode?: string;
  giftCardUsedAmount?: number;
  splitAmount?: number;
  discountTotal?: number;
  discountCode?: string | null;
  guestName?: string;
  partyName?: string;
  guestCount?: number | null;
  cashAmount?: number;
  cardAmount?: number;
  applyServiceCharge?: boolean;
  serviceChargeTotal?: number;
  serviceChargeName?: string | null;
}

export interface PaymentApiOrder extends ReceiptOrder {
  _id?: string;
  printJobId?: string | null;
  processedByName?: string;
  paymentStatus?: string;
  status?: string;
  invoiceNumber?: string;
  giftcardCode?: string | null;
  giftcardUsedAmount?: number;
  paidAt?: string;
  cardType?: string;
  staffFor?: string;
}

export interface PaymentProcessResult {
  success: boolean;
  message?: string;
  order?: PaidOrderSnapshot;
  printJobId?: string | null;
  alreadyPaid?: boolean;
}

export interface AppliedPaymentDiscount {
  code: string;
  type: 'percent' | 'fixed' | 'dollar';
  value: number;
}

export interface PaymentCalculationInput {
  items: CartLineItem[];
  subTotal: number;
  taxTotal: number;
  appliedDiscount?: AppliedPaymentDiscount | null;
  includeServiceCharge?: boolean;
  giftCardUsedAmount?: number;
  serviceTax?: ServiceTaxConfig | null;
}

export interface PaymentCalculationResult {
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  serviceChargeTotal: number;
  serviceChargeName?: string;
  giftCardUsed: number;
  totalDue: number;
  taxBreakdown: TaxBreakdownLine[];
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
