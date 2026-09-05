import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import type {CartLineItem} from '../types/cart';
import type {
  AppliedPaymentDiscount,
  DiscountCoupon,
  GiftCardDetails,
  PaymentApiOrder,
  PaymentCalculationInput,
  PaymentCalculationResult,
  PaymentProcessResult,
  PaymentRequestPayload,
  ServiceTaxConfig,
} from '../types/payment';
import type {PaidOrderSnapshot} from '../types/receipt';
import type {ApiOrderItem} from '../types/order';
import {buildCartFromOrderItems} from '../utils/orderCartMapper';
import {
  computeOrderServiceCharge,
  normalizeServiceTaxFromApi,
} from '../utils/serviceCharge';
import {roundMoney} from '../utils/receiptFormat';
import {
  computeDiscountAmount,
  computeServiceCharge,
  findMockDiscount,
  MOCK_SERVICE_TAX,
  verifyMockGiftCard,
} from '../mocks/paymentMockData';
import {api} from './api';
import {fetchOrderById} from './orderService';
import {fetchTodayOrders} from './todayOrdersService';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapPaymentApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message = (error.response?.data as {message?: string})?.message;

    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
      return "You don't have permission to process payments.";
    }
    if (status === 409) {
      return message || 'This order has already been paid.';
    }
    if (status === 422 || status === 400) {
      return message || 'Payment could not be validated.';
    }
    if (status && status >= 500) {
      return 'Server error. Please try again.';
    }
    if (!error.response) {
      return 'Unable to process payment. Check your connection and try again.';
    }
    return message || 'Payment failed.';
  }
  return 'Payment failed.';
}

export function isPaymentApiConfigured(): boolean {
  return useLiveApi;
}

export function calculatePaymentTotals(
  input: PaymentCalculationInput,
): PaymentCalculationResult {
  const subTotal = roundMoney(input.subTotal);
  const taxTotal = roundMoney(input.taxTotal);

  let discountTotal = 0;
  if (input.appliedDiscount) {
    if (input.appliedDiscount.type === 'percent') {
      discountTotal = roundMoney(
        (subTotal * input.appliedDiscount.value) / 100,
      );
    } else {
      discountTotal = roundMoney(
        Math.min(input.appliedDiscount.value, subTotal),
      );
    }
  }

  const effectiveServiceTax =
    input.serviceTax ?? (useLiveApi ? null : MOCK_SERVICE_TAX);
  const serviceChargeTotal =
    input.includeServiceCharge && effectiveServiceTax
      ? useLiveApi
        ? computeOrderServiceCharge({
            serviceTax: effectiveServiceTax,
            subtotal: subTotal,
            discountAmount: discountTotal,
          })
        : computeServiceCharge(subTotal, discountTotal, effectiveServiceTax)
      : 0;

  const serviceChargeName =
    input.includeServiceCharge && effectiveServiceTax
      ? effectiveServiceTax.name
      : undefined;

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
    serviceChargeName,
    giftCardUsed,
    totalDue,
    taxBreakdown: [{name: 'Tax', amount: taxTotal}],
  };
}

function mapApiDiscountType(
  raw: string,
): AppliedPaymentDiscount['type'] {
  const lower = raw.toLowerCase();
  if (lower === 'percent') {
    return 'percent';
  }
  if (lower === 'amount' || lower === 'fixed') {
    return 'fixed';
  }
  return 'dollar';
}

export async function fetchAvailableDiscounts(): Promise<DiscountCoupon[]> {
  if (!useLiveApi) {
    return [];
  }

  try {
    const response = await api.get<
      ApiEnvelope<
        Array<{
          code: string;
          discountType: string;
          value: number;
        }>
      >
    >('/api/orders/discount');

    if (!response.data?.success) {
      return [];
    }

    return (response.data.data || []).map((row) => ({
      code: row.code,
      discountType:
        String(row.discountType).toLowerCase() === 'percent'
          ? 'percent'
          : 'fixed',
      value: Number(row.value) || 0,
    }));
  } catch {
    return [];
  }
}

export async function applyDiscountCode(
  code: string,
): Promise<AppliedPaymentDiscount | null> {
  if (!useLiveApi) {
    const coupon = findMockDiscount(code);
    if (!coupon) {
      return null;
    }
    return {
      code: coupon.code,
      type: mapApiDiscountType(coupon.discountType),
      value: coupon.value,
    };
  }

  try {
    const response = await api.post<
      ApiEnvelope<{
        code: string;
        discountType: string;
        value: number;
      }>
    >('/api/orders/discount', {code: code.trim()});

    if (!response.data?.success || !response.data.data) {
      return null;
    }

    const data = response.data.data;
    return {
      code: data.code,
      type: mapApiDiscountType(data.discountType),
      value: Number(data.value) || 0,
    };
  } catch {
    return null;
  }
}

export async function verifyGiftCard(code: string): Promise<GiftCardDetails | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (!useLiveApi) {
    return verifyMockGiftCard(normalized);
  }

  try {
    const response = await api.get<
      ApiEnvelope<{
        code: string;
        balance: number;
        status?: string;
      }>
    >(`/api/menu/giftcards?code=${encodeURIComponent(normalized)}`);

    if (!response.data?.success || !response.data.data) {
      return null;
    }

    const data = response.data.data;
    return {
      code: data.code,
      balance: Number(data.balance) || 0,
      status: data.status,
    };
  } catch {
    return null;
  }
}

export async function fetchActiveServiceTax(): Promise<ServiceTaxConfig | null> {
  if (!useLiveApi) {
    return MOCK_SERVICE_TAX.active ? MOCK_SERVICE_TAX : null;
  }

  try {
    const response = await api.get<ApiEnvelope<Record<string, unknown>[]>>(
      '/api/tax/servicetax?active=1',
    );

    if (!response.data?.success) {
      return null;
    }

    const first = response.data.data?.[0];
    if (!first) {
      return null;
    }

    return normalizeServiceTaxFromApi(first);
  } catch {
    return null;
  }
}

function mapTaxBreakdownFromApi(
  data: PaymentApiOrder,
): PaidOrderSnapshot['taxBreakdown'] {
  const raw = (data as {taxBreakdown?: Array<{name?: string; amount?: number}>})
    .taxBreakdown;
  if (!Array.isArray(raw) || raw.length === 0) {
    const taxTotal = Number(data.taxTotal) || 0;
    return taxTotal > 0 ? [{name: 'Tax', amount: taxTotal}] : undefined;
  }
  return raw.map((line) => ({
    name: String(line.name ?? 'Tax'),
    amount: roundMoney(Number(line.amount) || 0),
  }));
}

export function mapPaymentResponseToSnapshot(
  data: PaymentApiOrder,
  items?: CartLineItem[],
): PaidOrderSnapshot {
  const orderItems =
    items ??
    (Array.isArray((data as {items?: ApiOrderItem[]}).items)
      ? buildCartFromOrderItems((data as {items: ApiOrderItem[]}).items)
      : data.items ?? []);

  return {
    orderNumber: data.orderNumber,
    orderId: data._id ?? data.orderId,
    tableNo: data.tableNo,
    floorName: data.floorName,
    guestName: data.guestName,
    partyName: data.partyName,
    guestCount: data.guestCount,
    items: orderItems,
    subTotal: data.subTotal,
    taxTotal: data.taxTotal,
    discountTotal: data.discountTotal,
    discountCode: data.discountCode,
    giftcardUsedAmount: data.giftcardUsedAmount,
    totalAmount: data.totalAmount,
    tipAmount: data.tipAmount,
    tipMethod: data.tipMethod,
    serviceChargeTotal: data.serviceChargeTotal,
    serviceChargeName: data.serviceChargeName,
    paymentMethod: data.paymentMethod,
    cashAmount: data.cashAmount,
    cardAmount: data.cardAmount,
    paymentStatus: data.paymentStatus ?? 'PAID',
    paidAt: data.paidAt ?? new Date().toISOString(),
    createdAt: data.createdAt ?? new Date().toISOString(),
    invoiceNumber: data.invoiceNumber,
    cardType: data.cardType,
    specialNote: data.specialNote,
    source: data.source,
    taxBreakdown: mapTaxBreakdownFromApi(data),
  };
}

function isOrderPaidOnServer(order: {
  paymentStatus?: string;
  status?: string;
}): boolean {
  const paymentStatus = String(order.paymentStatus ?? '').toUpperCase();
  const status = String(order.status ?? '').toUpperCase();
  return paymentStatus === 'PAID' || status === 'PAID';
}

export interface PaymentRecoveryState {
  paid: boolean;
  order?: PaidOrderSnapshot;
  printJobId?: string | null;
}

export async function fetchPaymentRecoveryState(
  orderId: string,
): Promise<PaymentRecoveryState> {
  if (!orderId) {
    return {paid: false};
  }

  if (!useLiveApi) {
    return {paid: false};
  }

  try {
    const order = await fetchOrderById(orderId);
    if (order && isOrderPaidOnServer(order)) {
      const snapshot = mapPaymentResponseToSnapshot(order as PaymentApiOrder);
      return {
        paid: true,
        order: snapshot,
        printJobId: (order as {printJobId?: string}).printJobId ?? null,
      };
    }
  } catch {
    // Fall through to today's orders list (paid orders excluded from orderId GET)
  }

  try {
    const today = await fetchTodayOrders();
    if (today.success && today.data) {
      const match = today.data.find((row) => row._id === orderId);
      if (match && isOrderPaidOnServer(match)) {
        const snapshot = mapPaymentResponseToSnapshot({
          _id: match._id,
          orderNumber: match.orderNumber,
          orderId: match._id,
          tableNo: match.tableNo,
          floorName: match.floorName,
          guestName: match.guestName,
          partyName: match.partyName,
          guestCount: match.guestCount,
          subTotal: match.subTotal ?? 0,
          taxTotal: match.taxTotal ?? 0,
          discountTotal: match.discountTotal,
          discountCode: match.discountCode,
          giftcardUsedAmount: match.giftcardUsedAmount,
          totalAmount: match.totalAmount,
          tipAmount: match.tipAmount,
          paymentMethod: match.paymentMethod,
          paymentStatus: match.paymentStatus ?? 'PAID',
          status: match.status,
          paidAt: new Date().toISOString(),
          createdAt: match.createdAt,
          items: match.items,
        } as PaymentApiOrder);
        return {paid: true, order: snapshot};
      }
    }
  } catch {
    // Recovery inconclusive
  }

  return {paid: false};
}

export async function processPayment(
  payload: PaymentRequestPayload,
  cartItems?: CartLineItem[],
): Promise<PaymentProcessResult> {
  if (!useLiveApi) {
    return processPaymentMockLegacy(payload, cartItems);
  }

  try {
    const response = await api.post<ApiEnvelope<PaymentApiOrder>>(
      '/api/sales/payments',
      payload,
    );

    if (!response.data?.success || !response.data.data) {
      return {
        success: false,
        message: response.data?.message || 'Payment failed.',
      };
    }

    const data = response.data.data;
    const order = mapPaymentResponseToSnapshot(data, cartItems);

    return {
      success: true,
      order,
      printJobId: data.printJobId ?? null,
    };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 409) {
      return {
        success: false,
        alreadyPaid: true,
        message: mapPaymentApiError(error),
      };
    }
    return {success: false, message: mapPaymentApiError(error)};
  }
}

async function processPaymentMockLegacy(
  payload: PaymentRequestPayload,
  cartItems?: CartLineItem[],
): Promise<PaymentProcessResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));

  const totals = calculatePaymentTotals({
    items: cartItems ?? [],
    subTotal: payload.amount,
    taxTotal: 0,
    appliedDiscount: payload.discountCode
      ? {
          code: payload.discountCode,
          type: 'fixed',
          value: payload.discountTotal ?? 0,
        }
      : null,
    includeServiceCharge: payload.applyServiceCharge,
    giftCardUsedAmount: payload.giftCardUsedAmount,
  });

  const paidOrder: PaidOrderSnapshot = {
    orderNumber: '0000',
    orderId: payload.orderId,
    guestName: payload.guestName,
    partyName: payload.partyName,
    guestCount: payload.guestCount ?? undefined,
    items: cartItems ?? [],
    subTotal: totals.subTotal,
    taxTotal: totals.taxTotal,
    discountTotal: totals.discountTotal,
    discountCode: payload.discountCode ?? undefined,
    giftcardUsedAmount: totals.giftCardUsed,
    totalAmount: totals.totalDue,
    tipAmount: payload.tipAmount ?? 0,
    tipMethod: payload.tipMethod ?? undefined,
    serviceChargeTotal: totals.serviceChargeTotal,
    serviceChargeName: totals.serviceChargeName,
    paymentMethod: payload.method,
    cashAmount: payload.cashAmount ?? 0,
    cardAmount: payload.cardAmount ?? 0,
    paymentStatus: 'PAID',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    cardType: payload.cardType,
  };

  return {
    success: true,
    order: paidOrder,
    printJobId: `mock-receipt-${Date.now()}`,
  };
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
  return {
    code: coupon.code,
    type: 'fixed',
    value: Math.min(coupon.value, subtotal),
  };
}

export {computeDiscountAmount, verifyMockGiftCard, MOCK_SERVICE_TAX};
