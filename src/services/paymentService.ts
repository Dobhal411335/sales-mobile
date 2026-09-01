import type {
  AppliedPaymentDiscount,
  PaymentProcessResult,
  PaymentRequestPayload,
} from '../types/payment';
import type {PaidOrderSnapshot, TaxBreakdownLine} from '../types/receipt';
import type {CartLineItem} from '../types/cart';
import {
  computeServiceCharge,
  findMockDiscount,
  MOCK_SERVICE_TAX,
} from '../mocks/paymentMockData';
import {roundMoney} from '../utils/receiptFormat';

export interface PaymentCalculationInput {
  items: CartLineItem[];
  subTotal: number;
  taxTotal: number;
  appliedDiscount?: AppliedPaymentDiscount | null;
  includeServiceCharge?: boolean;
  giftCardUsedAmount?: number;
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

export function calculatePaymentTotals(
  input: PaymentCalculationInput,
): PaymentCalculationResult {
  const subTotal = roundMoney(input.subTotal);
  const taxTotal = roundMoney(input.taxTotal);

  let discountTotal = 0;
  if (input.appliedDiscount) {
    if (input.appliedDiscount.type === 'percent') {
      discountTotal = roundMoney((subTotal * input.appliedDiscount.value) / 100);
    } else {
      discountTotal = roundMoney(
        Math.min(input.appliedDiscount.value, subTotal),
      );
    }
  }

  const serviceChargeTotal = input.includeServiceCharge
    ? computeServiceCharge(subTotal, discountTotal, MOCK_SERVICE_TAX)
    : 0;

  const giftCardUsed = roundMoney(
    Math.min(
      input.giftCardUsedAmount ?? 0,
      Math.max(0, subTotal - discountTotal + taxTotal + serviceChargeTotal),
    ),
  );

  const totalDue = roundMoney(
    Math.max(
      0,
      subTotal - discountTotal + taxTotal + serviceChargeTotal - giftCardUsed,
    ),
  );

  return {
    subTotal,
    taxTotal,
    discountTotal,
    serviceChargeTotal,
    serviceChargeName: input.includeServiceCharge
      ? MOCK_SERVICE_TAX.name
      : undefined,
    giftCardUsed,
    totalDue,
    taxBreakdown: [{name: 'HST', amount: taxTotal}],
  };
}

export async function processPaymentMock(
  payload: PaymentRequestPayload,
  orderContext: {
    orderNumber: string;
    orderId: string;
    items: CartLineItem[];
    totals: PaymentCalculationResult;
    partyName?: string;
    tableNo?: string;
    floorName?: string;
    guestCount?: number;
    cardType?: string;
  },
  options?: {shouldFail?: boolean},
): Promise<PaymentProcessResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));

  if (options?.shouldFail) {
    return {
      success: false,
      message: 'Payment could not be completed. Try again.',
    };
  }

  const paidOrder: PaidOrderSnapshot = {
    orderNumber: orderContext.orderNumber,
    orderId: orderContext.orderId,
    tableNo: orderContext.tableNo,
    floorName: orderContext.floorName,
    guestCount: orderContext.guestCount,
    partyName: orderContext.partyName,
    guestName: payload.guestName ?? orderContext.partyName,
    items: orderContext.items,
    subTotal: orderContext.totals.subTotal,
    taxTotal: orderContext.totals.taxTotal,
    discountTotal: orderContext.totals.discountTotal,
    discountCode: payload.discountCode,
    giftcardUsedAmount: orderContext.totals.giftCardUsed,
    totalAmount: orderContext.totals.totalDue,
    tipAmount: payload.tipAmount ?? 0,
    tipMethod: payload.tipMethod,
    serviceChargeTotal: orderContext.totals.serviceChargeTotal,
    serviceChargeName: orderContext.totals.serviceChargeName,
    paymentMethod: payload.paymentMethod,
    cashAmount: payload.cashAmount ?? 0,
    cardAmount: payload.cardAmount ?? 0,
    paymentStatus: 'PAID',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    cardType: orderContext.cardType,
  };

  return {success: true, order: paidOrder};
}

export function applyMockDiscount(
  code: string,
  subtotal: number,
): AppliedPaymentDiscount | null {
  const coupon = findMockDiscount(code);
  if (!coupon) {
    return null;
  }
  if (coupon.discountType === 'percent') {
    return {
      code: coupon.code,
      type: 'percent',
      value: coupon.value,
    };
  }
  const amount = Math.min(coupon.value, subtotal);
  return {
    code: coupon.code,
    type: 'dollar',
    value: amount,
  };
}
