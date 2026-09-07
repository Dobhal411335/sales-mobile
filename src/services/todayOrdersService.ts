import {isAxiosError} from 'axios';
import {config} from '../constants/config';
import {
  getMockTodayOrders,
  updateMockOrder,
} from '../mocks/todayOrdersMockData';
import type {
  TodayOrder,
  TodayOrdersResponse,
  WaiveOrderResponse,
} from '../types/todayOrder';
import {api} from './api';

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

const useLiveApi = Boolean(config.API_BASE_URL);

function mapTodayOrdersApiError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message = (error.response?.data as {message?: string})?.message;
    if (status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (status === 403) {
      return "You don't have permission to view today's orders.";
    }
    if (!error.response) {
      return 'Unable to load orders. Check your connection and try again.';
    }
    return message || fallback;
  }
  return fallback;
}

function toId(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as {_id: unknown})._id);
  }
  return String(value);
}

function normalizeTodayOrder(raw: Record<string, unknown>): TodayOrder {
  const processedBy = raw.processedBy as Record<string, unknown> | string | undefined;
  let processedByName = raw.processedByName ? String(raw.processedByName) : undefined;
  if (!processedByName && processedBy && typeof processedBy === 'object') {
    processedByName =
      processedBy.name != null
        ? String(processedBy.name)
        : [processedBy.firstName, processedBy.lastName].filter(Boolean).join(' ');
  }

  const floorRaw = raw.floor as {name?: string} | undefined;
  const tableSession = raw.tableSession;

  return {
    _id: toId(raw._id ?? raw.id),
    orderNumber: String(raw.orderNumber ?? ''),
    status: String(raw.status ?? 'PENDING') as TodayOrder['status'],
    source: raw.source ? (String(raw.source) as TodayOrder['source']) : undefined,
    paymentStatus: raw.paymentStatus
      ? (String(raw.paymentStatus) as TodayOrder['paymentStatus'])
      : undefined,
    paymentMethod: raw.paymentMethod ? String(raw.paymentMethod) : undefined,
    cashAmount: raw.cashAmount != null ? Number(raw.cashAmount) : undefined,
    cardAmount: raw.cardAmount != null ? Number(raw.cardAmount) : undefined,
    totalAmount: Number(raw.totalAmount) || 0,
    subTotal: raw.subTotal != null ? Number(raw.subTotal) : undefined,
    taxTotal: raw.taxTotal != null ? Number(raw.taxTotal) : undefined,
    discountTotal: raw.discountTotal != null ? Number(raw.discountTotal) : undefined,
    discountCode: raw.discountCode ? String(raw.discountCode) : undefined,
    tipAmount: raw.tipAmount != null ? Number(raw.tipAmount) : undefined,
    giftcardUsedAmount:
      raw.giftcardUsedAmount != null ? Number(raw.giftcardUsedAmount) : undefined,
    giftcardCode: raw.giftcardCode ? String(raw.giftcardCode) : undefined,
    tableNo: raw.tableNo ? String(raw.tableNo) : undefined,
    floorName: raw.floorName
      ? String(raw.floorName)
      : floorRaw?.name
        ? String(floorRaw.name)
        : undefined,
    floor: floorRaw,
    guestName: raw.guestName ? String(raw.guestName) : undefined,
    partyName: raw.partyName ? String(raw.partyName) : undefined,
    guestCount: raw.guestCount != null ? Number(raw.guestCount) : undefined,
    specialNote: raw.specialNote ? String(raw.specialNote) : undefined,
    staffOrderReason: raw.staffOrderReason
      ? String(raw.staffOrderReason)
      : undefined,
    waiveReason: raw.waiveReason ? String(raw.waiveReason) : undefined,
    processedByName,
    processedByRole: raw.processedByRole ? String(raw.processedByRole) : undefined,
    processedBy: processedBy as TodayOrder['processedBy'],
    tableSession:
      tableSession != null
        ? typeof tableSession === 'object'
          ? { _id: toId((tableSession as {_id?: unknown})._id) }
          : String(tableSession)
        : undefined,
    items: Array.isArray(raw.items)
      ? raw.items.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            name: String(row.name ?? ''),
            qty: Number(row.qty) || 1,
            price: Number(row.price) || 0,
            size: row.size ? String(row.size) : undefined,
            preparationStyle: row.preparationStyle
              ? String(row.preparationStyle)
              : undefined,
            options: Array.isArray(row.options)
              ? row.options.map((v) => String(v))
              : undefined,
            productType: row.productType ? String(row.productType) : undefined,
            category: row.category ? String(row.category) : undefined,
          };
        })
      : undefined,
    taxBreakdown: Array.isArray(raw.taxBreakdown)
      ? (raw.taxBreakdown as Array<{
          name?: string;
          rate?: number;
          amount?: number;
          taxAmount?: number;
        }>)
      : undefined,
    discountPercent:
      raw.discountPercent != null ? Number(raw.discountPercent) : undefined,
    serviceChargeTotal:
      raw.serviceChargeTotal != null ? Number(raw.serviceChargeTotal) : undefined,
    serviceChargeName:
      raw.serviceChargeName ? String(raw.serviceChargeName) : undefined,
    tipMethod: raw.tipMethod ? String(raw.tipMethod) : undefined,
    restaurantName: raw.restaurantName ? String(raw.restaurantName) : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

export function isTodayOrdersApiConfigured(): boolean {
  return useLiveApi;
}

export async function fetchEmployeeSales(
  todayOnly = false,
): Promise<TodayOrdersResponse> {
  if (!useLiveApi) {
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    return {
      success: true,
      data: getMockTodayOrders(),
    };
  }

  try {
    const url = todayOnly
      ? '/api/orders/employee?today=true'
      : '/api/orders/employee';
    const response = await api.get<ApiEnvelope<Record<string, unknown>[]>>(url);

    if (!response.data?.success) {
      return {
        success: false,
        message: response.data?.message || 'Failed to load sales data',
      };
    }

    return {
      success: true,
      data: (response.data.data || []).map((row) => normalizeTodayOrder(row)),
    };
  } catch (error) {
    return {
      success: false,
      message: mapTodayOrdersApiError(error, 'Failed to load sales data'),
    };
  }
}

export async function fetchTodayOrders(): Promise<TodayOrdersResponse> {
  if (!useLiveApi) {
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    return {
      success: true,
      data: getMockTodayOrders(),
    };
  }

  try {
    const response = await api.get<ApiEnvelope<Record<string, unknown>[]>>(
      '/api/orders/employee?today=true',
    );

    if (!response.data?.success) {
      return {
        success: false,
        message: response.data?.message || 'Failed to load today orders',
      };
    }

    return {
      success: true,
      data: (response.data.data || []).map((row) => normalizeTodayOrder(row)),
    };
  } catch (error) {
    return {
      success: false,
      message: mapTodayOrdersApiError(error, 'Failed to load today orders'),
    };
  }
}

export async function waiveTodayOrder(
  orderId: string,
  reason: string,
): Promise<WaiveOrderResponse> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return {success: false, message: 'Please enter a reason for waiving this bill.'};
  }

  if (!useLiveApi) {
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    const orders = getMockTodayOrders();
    const order = orders.find((o) => o._id === orderId);
    if (!order) {
      return {success: false, message: 'Order not found.'};
    }

    if (order.paymentStatus === 'PAID' || order.status === 'PAID') {
      return {success: false, message: 'This order is already paid.'};
    }

    if (order.status === 'WAIVED' || order.status === 'CANCELLED') {
      return {success: false, message: 'This order cannot be waived.'};
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return {
        success: false,
        message: 'Only pending or confirmed orders can be waived.',
      };
    }

    const updated: TodayOrder = {
      ...order,
      status: 'WAIVED',
      waiveReason: trimmedReason,
      paymentStatus: 'UNPAID',
    };

    const sessionReleased = Boolean(order.tableSession);
    updateMockOrder(updated);

    return {
      success: true,
      data: {...updated, sessionReleased},
    };
  }

  try {
    const response = await api.patch<
      ApiEnvelope<TodayOrder & {sessionReleased?: boolean}>
    >('/api/orders/employee', {
      orderId,
      action: 'waive',
      reason: trimmedReason,
    });

    if (!response.data?.success || !response.data.data) {
      return {
        success: false,
        message: response.data?.message || 'Failed to waive bill.',
      };
    }

    const data = response.data.data;
    const row = data as unknown as Record<string, unknown>;
    return {
      success: true,
      data: {
        ...normalizeTodayOrder(row),
        sessionReleased: Boolean(
          (data as {sessionReleased?: boolean}).sessionReleased,
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: mapTodayOrdersApiError(error, 'Failed to waive bill.'),
    };
  }
}
