import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import type {CartLineItem} from '../types/cart';
import type {OrderType} from '../navigation/types';
import type {TaxRate} from '../types/product';
import type {ApiOrder, SubmitOrderApiResponse} from '../types/order';
import type {KotLineItem, ReceiptOrder, TicketType} from '../types/receipt';
import {buildCartFromOrderItems} from '../utils/orderCartMapper';
import {cartLineToKotItem} from '../utils/receiptFormat';
import {buildCartTotals, getCartFingerprint} from '../utils/cartPricing';
import {api} from './api';

export interface SubmitOrderPayload {
  items: CartLineItem[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  discountCode?: string | null;
  totalAmount: number;
  specialNote?: string;
  sessionId?: string | null;
  orderId?: string;
  tableNo?: string;
  guestName?: string;
  partyName?: string;
  contactNumber?: string | null;
  guestCountryCode?: string | null;
  guestEmail?: string | null;
  guestCount?: number | null;
  orderType?: OrderType;
  source?: string;
  staffForId?: string;
  staffOrderReason?: string | null;
  floorName?: string;
}

export interface SubmitOrderResult {
  success: boolean;
  message?: string;
  data?: {
    _id: string;
    orderNumber: string;
    ticketType: TicketType;
    kotPayload: KotLineItem[];
    items: CartLineItem[];
    subTotal: number;
    taxTotal: number;
    discountTotal: number;
    discountCode?: string;
    totalAmount: number;
    processedByName?: string;
    source?: string;
    tableNo?: string;
    guestCount?: number;
    floorName?: string;
    partyName?: string;
    guestName?: string;
    specialNote?: string;
    createdAt: string;
    status?: string;
    printJobId?: string | null;
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapOrderApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message = (error.response?.data as {message?: string})?.message;

    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
      return "You don't have permission to modify this order.";
    }
    if (status === 409) {
      return message || 'Order conflict. Refresh and try again.';
    }
    if (status === 422) {
      return message || 'Order could not be validated.';
    }
    if (status && status >= 500) {
      return 'Server error. Please try again.';
    }
    if (!error.response) {
      return 'Unable to send order. Check your connection and try again.';
    }
    return message || 'Unable to send order.';
  }
  return 'Unable to send order.';
}

function normalizeKotItems(raw: unknown[]): KotLineItem[] {
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      name: String(row.name ?? ''),
      qty: Number(row.qty) || 1,
      productCode: row.productCode ? String(row.productCode) : undefined,
      category: row.category ? String(row.category) : undefined,
      size: row.size ? String(row.size) : undefined,
      options: Array.isArray(row.options)
        ? row.options.map((v) => String(v))
        : undefined,
      isOffer: Boolean(row.isOffer),
    };
  });
}

function mapSubmitResponse(data: SubmitOrderApiResponse): SubmitOrderResult['data'] {
  const items = buildCartFromOrderItems(data.items);
  return {
    _id: data._id,
    orderNumber: data.orderNumber,
    ticketType: data.ticketType,
    kotPayload: normalizeKotItems(data.kotPayload || []),
    items,
    subTotal: data.subTotal,
    taxTotal: data.taxTotal,
    discountTotal: data.discountTotal,
    discountCode: data.discountCode,
    totalAmount: data.totalAmount,
    processedByName: data.processedByName,
    source: data.source,
    tableNo: data.tableNo,
    guestCount: data.guestCount,
    floorName: data.floorName,
    partyName: data.partyName,
    guestName: data.guestName,
    specialNote: data.specialNote,
    createdAt: data.createdAt,
    status: data.status,
    printJobId: data.printJobId ?? null,
  };
}

export function isOrderApiConfigured(): boolean {
  return useLiveApi;
}

export async function fetchOrderBySession(
  sessionId: string,
): Promise<ApiOrder | null> {
  if (!useLiveApi) {
    throw new Error('API not configured');
  }

  try {
    const response = await api.get<ApiEnvelope<ApiOrder | null>>(
      `/api/orders/employee?sessionId=${encodeURIComponent(sessionId)}`,
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to load order');
    }

    return response.data.data ?? null;
  } catch (error) {
    throw new Error(mapOrderApiError(error));
  }
}

export async function fetchOrderById(orderId: string): Promise<ApiOrder | null> {
  if (!useLiveApi) {
    throw new Error('API not configured');
  }

  try {
    const response = await api.get<ApiEnvelope<ApiOrder | null>>(
      `/api/orders/employee?orderId=${encodeURIComponent(orderId)}`,
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to load order');
    }

    return response.data.data ?? null;
  } catch (error) {
    throw new Error(mapOrderApiError(error));
  }
}

export async function submitOrder(
  payload: SubmitOrderPayload,
): Promise<SubmitOrderResult> {
  if (!useLiveApi) {
    return submitOrderMock(payload);
  }

  if (!payload.items.length) {
    return {success: false, message: 'Cart is empty.'};
  }

  try {
    const body = {
      items: payload.items,
      subTotal: payload.subTotal,
      taxTotal: payload.taxTotal,
      serviceChargeTotal: 0,
      serviceChargeName: null,
      discountTotal: payload.discountTotal,
      discountCode: payload.discountCode ?? null,
      totalAmount: payload.totalAmount,
      specialNote: payload.specialNote ?? '',
      sessionId: payload.sessionId ?? null,
      orderId: payload.orderId ?? undefined,
      tableNo: payload.tableNo ?? undefined,
      guestName: payload.partyName ?? payload.guestName,
      partyName: payload.partyName ?? payload.guestName,
      contactNumber: payload.contactNumber ?? null,
      guestCountryCode: payload.guestCountryCode ?? null,
      guestEmail: payload.guestEmail ?? null,
      guestCount: payload.guestCount ?? null,
      orderType: 'Dine-in',
      source: payload.source ?? undefined,
      staffForId: payload.staffForId ?? undefined,
      staffOrderReason: payload.staffOrderReason ?? undefined,
    };

    const response = await api.post<ApiEnvelope<SubmitOrderApiResponse>>(
      '/api/orders/employee',
      body,
    );

    if (!response.data?.success || !response.data.data) {
      return {
        success: false,
        message: response.data?.message || 'Failed to send order',
      };
    }

    return {
      success: true,
      data: mapSubmitResponse(response.data.data),
    };
  } catch (error) {
    return {success: false, message: mapOrderApiError(error)};
  }
}

let mockOrderSequence = 163;

export async function submitOrderMock(
  payload: SubmitOrderPayload,
): Promise<SubmitOrderResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  if (!payload.items.length) {
    return {success: false, message: 'Cart is empty.'};
  }

  mockOrderSequence += 1;
  const orderNumber = String(mockOrderSequence).padStart(4, '0');
  const orderId = payload.orderId ?? `order-${Date.now()}`;
  const kotPayload = payload.items.map(cartLineToKotItem);
  const ticketType: TicketType =
    payload.items.length > 0 &&
    payload.items.every((item) => item.category?.toLowerCase().includes('bar'))
      ? 'BAR_RECEIPT'
      : 'KOT';

  return {
    success: true,
    data: {
      _id: orderId,
      orderNumber,
      ticketType,
      kotPayload,
      items: payload.items,
      subTotal: payload.subTotal,
      taxTotal: payload.taxTotal,
      discountTotal: payload.discountTotal,
      discountCode: payload.discountCode ?? undefined,
      totalAmount: payload.totalAmount,
      processedByName: 'Demo Server',
      source: payload.source,
      tableNo: payload.tableNo,
      guestCount: payload.guestCount ?? undefined,
      floorName: payload.floorName,
      partyName: payload.partyName,
      guestName: payload.guestName,
      specialNote: payload.specialNote,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      printJobId: `mock-print-${Date.now()}`,
    },
  };
}

export function buildSubmitPayloadFromCart(
  items: CartLineItem[],
  globalTaxes: TaxRate[],
  appliedDiscount: {code?: string; type: 'percent' | 'fixed'; value: number} | null,
  orderNote: string,
  extras: Partial<SubmitOrderPayload>,
): SubmitOrderPayload {
  const totals = buildCartTotals(items, globalTaxes, appliedDiscount);
  return {
    items,
    subTotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    discountTotal: totals.discountTotal,
    discountCode: appliedDiscount?.code ?? null,
    totalAmount: totals.total,
    specialNote: orderNote,
    ...extras,
  };
}

export function toReceiptOrder(
  data: SubmitOrderResult['data'],
): ReceiptOrder | null {
  if (!data) {
    return null;
  }
  return {
    orderNumber: data.orderNumber,
    orderId: data._id,
    tableNo: data.tableNo,
    floorName: data.floorName,
    guestName: data.guestName,
    partyName: data.partyName,
    guestCount: data.guestCount,
    createdAt: data.createdAt,
    specialNote: data.specialNote,
    items: data.items,
    subTotal: data.subTotal,
    taxTotal: data.taxTotal,
    discountTotal: data.discountTotal,
    discountCode: data.discountCode,
    totalAmount: data.totalAmount,
    source: data.source,
  };
}

export {getCartFingerprint};
