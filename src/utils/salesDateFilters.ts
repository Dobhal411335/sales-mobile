import type {SalesDateRange, TodayOrder} from '../types/todayOrder';

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isSameWeek(date: Date, now: Date): boolean {
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  // Set to Sunday of current week
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  return date >= startOfWeek && date < endOfWeek;
}

export function isSameMonth(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
  );
}

export function filterOrdersByDateRange(
  orders: TodayOrder[],
  dateRange: SalesDateRange,
): TodayOrder[] {
  if (!orders.length || dateRange === 'All') {
    return orders;
  }

  const now = new Date();
  return orders.filter((o) => {
    if (!o.createdAt) return true;
    const d = new Date(o.createdAt);
    if (isNaN(d.getTime())) return true;

    if (dateRange === 'Today') {
      return isSameDay(d, now);
    }
    if (dateRange === 'This Week') {
      return isSameWeek(d, now);
    }
    if (dateRange === 'This Month') {
      return isSameMonth(d, now);
    }
    return true;
  });
}

export function formatOrderHour(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '12 PM';
  const hours = d.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours} ${suffix}`;
}

export interface HourlySalesPoint {
  time: string;
  sales: number;
}

export function computeHourlySalesData(
  orders: TodayOrder[],
): HourlySalesPoint[] {
  if (!orders.length) {
    return [
      {time: '9 AM', sales: 0},
      {time: '11 AM', sales: 0},
      {time: '1 PM', sales: 0},
      {time: '3 PM', sales: 0},
      {time: '5 PM', sales: 0},
      {time: '7 PM', sales: 0},
      {time: '9 PM', sales: 0},
    ];
  }

  const hourlyMap: Record<string, number> = {};
  const hourOrder: string[] = [];

  // Group by hour
  orders.forEach((o) => {
    const hourStr = formatOrderHour(o.createdAt);
    if (hourlyMap[hourStr] === undefined) {
      hourlyMap[hourStr] = 0;
      hourOrder.push(hourStr);
    }
    hourlyMap[hourStr] += Number(o.totalAmount || 0);
  });

  return hourOrder.map((time) => ({
    time,
    sales: Math.round(hourlyMap[time] * 100) / 100,
  }));
}

export interface TopItemPoint {
  name: string;
  count: number;
}

export function computeTopSellingItems(
  orders: TodayOrder[],
  limit = 5,
): TopItemPoint[] {
  const itemMap: Record<string, number> = {};

  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const name = item.name || 'Item';
      itemMap[name] = (itemMap[name] || 0) + Number(item.qty || 1);
    });
  });

  const sorted = Object.entries(itemMap)
    .map(([name, count]) => ({name, count}))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  if (!sorted.length) {
    return [{name: 'No items yet', count: 0}];
  }

  return sorted;
}

export interface OrderTypeDistributionPoint {
  name: 'Dine-in' | 'Takeaway' | 'Online' | 'Staff';
  value: number;
  color: string;
}

export const ORDER_TYPE_COLORS: Record<string, string> = {
  'Dine-in': '#f97316',
  Takeaway: '#3b82f6',
  Online: '#10b981',
  Staff: '#8b5cf6',
};

export function computeOrderTypeDistribution(
  orders: TodayOrder[],
): OrderTypeDistributionPoint[] {
  const counts: Record<'Dine-in' | 'Takeaway' | 'Online' | 'Staff', number> = {
    'Dine-in': 0,
    Takeaway: 0,
    Online: 0,
    Staff: 0,
  };

  orders.forEach((o) => {
    const src = o.source || 'POS';
    if (src === 'ONLINE') counts.Online += 1;
    else if (src === 'STAFF') counts.Staff += 1;
    else if (src === 'WALK_IN') counts.Takeaway += 1;
    else counts['Dine-in'] += 1;
  });

  const result = (
    Object.entries(counts) as ['Dine-in' | 'Takeaway' | 'Online' | 'Staff', number][]
  )
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: ORDER_TYPE_COLORS[name] || '#71717a',
    }));

  return result.length > 0
    ? result
    : [{name: 'Dine-in', value: 1, color: ORDER_TYPE_COLORS['Dine-in']}];
}
