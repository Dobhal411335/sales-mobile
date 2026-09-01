import {
  getMockTodayOrders,
  updateMockOrder,
} from '../mocks/todayOrdersMockData';
import type {
  TodayOrder,
  TodayOrdersResponse,
  WaiveOrderResponse,
} from '../types/todayOrder';

// TODO: swap to api.get('/api/orders/employee', { params: { today: true } })
export async function fetchTodayOrders(): Promise<TodayOrdersResponse> {
  await new Promise<void>((resolve) => setTimeout(resolve, 600));
  return {
    success: true,
    data: getMockTodayOrders(),
  };
}

// TODO: swap to api.patch('/api/orders/employee', { orderId, action: 'waive', reason })
export async function waiveTodayOrder(
  orderId: string,
  reason: string,
): Promise<WaiveOrderResponse> {
  await new Promise<void>((resolve) => setTimeout(resolve, 500));

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return {success: false, message: 'Please enter a reason for waiving this bill.'};
  }

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
    return {success: false, message: 'Only pending or confirmed orders can be waived.'};
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
