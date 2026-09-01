import type {TodayOrder, TodaySalesMetric} from '../types/todayOrder';
import {formatCurrency} from './currency';
import {isOrderPaid} from './todayOrderHelpers';

function getValidOrders(orders: TodayOrder[]) {
  return orders.filter(
    (o) => o.status !== 'CANCELLED' && o.status !== 'WAIVED',
  );
}

function getPaidOrders(orders: TodayOrder[]) {
  return getValidOrders(orders).filter((o) => isOrderPaid(o));
}

function calculateCashTotal(orders: TodayOrder[]): number {
  let cash = 0;
  getPaidOrders(orders).forEach((order) => {
    const method = String(order.paymentMethod || '').toLowerCase();
    const giftUsed = Number(order.giftcardUsedAmount || 0);
    const isCash = method.includes('cash');
    const remaining = Math.max(0, Number(order.totalAmount || 0) - giftUsed);
    const tip = Number(order.tipAmount || 0);
    if (isCash) {
      cash += remaining + tip;
    }
  });
  return cash;
}

export function computeTodaySalesMetrics(
  orders: TodayOrder[],
  loading: boolean,
): TodaySalesMetric[] {
  const valid = getValidOrders(orders);
  const totalOrders = valid.length;
  const totalSales = valid.reduce(
    (sum, o) => sum + Number(o.totalAmount || 0),
    0,
  );
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const tipsEarned = valid.reduce(
    (sum, o) => sum + Number(o.tipAmount || 0),
    0,
  );
  const cashTotal = calculateCashTotal(orders);

  return [
    {
      key: 'sales',
      label: 'Total Sales',
      short: 'Sales',
      value: loading ? '—' : formatCurrency(totalSales),
    },
    {
      key: 'orders',
      label: 'Total Orders',
      short: 'Orders',
      value: loading ? '—' : String(totalOrders),
    },
    {
      key: 'avg',
      label: 'Avg Order Value',
      short: 'Avg',
      value: loading ? '—' : formatCurrency(avgOrderValue),
    },
    {
      key: 'tips',
      label: 'Tips Earned',
      short: 'Tips',
      value: loading ? '—' : formatCurrency(tipsEarned),
    },
    {
      key: 'cash',
      label: 'Cash',
      short: 'Cash',
      value: loading ? '—' : formatCurrency(cashTotal),
    },
  ];
}
