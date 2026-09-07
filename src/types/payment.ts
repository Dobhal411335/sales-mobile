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
  _id?: string;
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
  label?: string;
}

export interface GiftCardHistoryEntry {
  usedAt: string;
  amountUsed: number;
  balanceAfter: number;
  orderNumber?: string | null;
  note?: string | null;
}

export interface GiftCardDetails {
  _id?: string;
  code: string;
  name?: string;
  value?: number;
  balance: number;
  status?: string;
  isIssued?: boolean;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  issueDate?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  history?: GiftCardHistoryEntry[];
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
  discountPercent?: number | null;
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
