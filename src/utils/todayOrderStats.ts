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

  const paid = getPaidOrders(orders);
  const totals = {cash: 0, card: 0, gift: 0};
  const counts = {cash: 0, card: 0, gift: 0};

  paid.forEach((order) => {
    const method = String(order.paymentMethod || '').toLowerCase();
    const giftUsed = Number(order.giftcardUsedAmount || 0);
    const isCard = method.includes('card') && !method.includes('gift');
    const isCash = method.includes('cash');
    const isGift = method.includes('gift');
    const remaining = Math.max(0, Number(order.totalAmount || 0) - giftUsed);
    const tip = Number(order.tipAmount || 0);

    if (giftUsed > 0 || isGift) {
      totals.gift += giftUsed > 0 ? giftUsed : remaining + tip;
      counts.gift += 1;
    }
    if (isCash) {
      totals.cash += remaining + tip;
      counts.cash += 1;
    } else if (isCard) {
      totals.card += remaining + tip;
      counts.card += 1;
    }
  });

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
      value: loading ? '—' : formatCurrency(totals.cash),
      count: counts.cash,
    },
    {
      key: 'card',
      label: 'Card',
      short: 'Card',
      value: loading ? '—' : formatCurrency(totals.card),
      count: counts.card,
    },
    {
      key: 'gift',
      label: 'Gift',
      short: 'Gift',
      value: loading ? '—' : formatCurrency(totals.gift),
      count: counts.gift,
    },
  ];
}
