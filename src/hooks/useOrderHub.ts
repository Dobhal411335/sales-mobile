import {useCallback, useEffect, useMemo, useState} from 'react';
import {fetchTodayOrders} from '../services/todayOrdersService';
import {socketClient} from '../socket/socket';
import type {TodayOrder, TodayOrderSource} from '../types/todayOrder';
import {
  getOrderGrandTotal,
  isOrderOpen,
  isOrderPaid,
} from '../utils/todayOrderHelpers';

export type HubFilter = 'OPEN' | 'PAID' | 'ALL';

export interface HubStatBucket {
  count: number;
  amount: number;
}

export interface HubStats {
  OPEN: HubStatBucket;
  PAID: HubStatBucket;
  ALL: HubStatBucket;
}

interface UseOrderHubResult {
  orders: TodayOrder[];
  filtered: TodayOrder[];
  stats: HubStats;
  filter: HubFilter;
  setFilter: (filter: HubFilter) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: (options?: {silent?: boolean}) => Promise<void>;
}

function sortHubOrders(orders: TodayOrder[]): TodayOrder[] {
  return [...orders].sort((a, b) => {
    const aOpen = isOrderOpen(a) ? 0 : 1;
    const bOpen = isOrderOpen(b) ? 0 : 1;
    if (aOpen !== bOpen) {
      return aOpen - bOpen;
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export function useOrderHub(source: TodayOrderSource): UseOrderHubResult {
  const [orders, setOrders] = useState<TodayOrder[]>([]);
  const [filter, setFilter] = useState<HubFilter>('OPEN');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: {silent?: boolean}) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetchTodayOrders();
      if (response.success && response.data) {
        const sourceKey = String(source).toUpperCase();
        setOrders(
          response.data.filter(
            (order) => String(order.source || '').toUpperCase() === sourceKey,
          ),
        );
      } else {
        setError(response.message || 'Unable to load orders.');
      }
    } catch {
      setError('Unable to load orders. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [source]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = socketClient.getInstance();
    if (!socket) {
      return;
    }
    const onChange = () => {
      void refresh({silent: true});
    };
    socket.on('order:created', onChange);
    socket.on('order:updated', onChange);
    socket.on('payment:completed', onChange);
    return () => {
      socket.off('order:created', onChange);
      socket.off('order:updated', onChange);
      socket.off('payment:completed', onChange);
    };
  }, [refresh]);

  const stats = useMemo<HubStats>(() => {
    const openOrders = orders.filter(isOrderOpen);
    const paidOrders = orders.filter(isOrderPaid);
    const unpaidTotal = openOrders.reduce(
      (sum, order) => sum + getOrderGrandTotal(order),
      0,
    );
    const paidTotal = paidOrders.reduce(
      (sum, order) => sum + getOrderGrandTotal(order),
      0,
    );
    return {
      OPEN: {count: openOrders.length, amount: unpaidTotal},
      PAID: {count: paidOrders.length, amount: paidTotal},
      ALL: {
        count: orders.length,
        amount: unpaidTotal + paidTotal,
      },
    };
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter === 'OPEN') {
      list = orders.filter(isOrderOpen);
    } else if (filter === 'PAID') {
      list = orders.filter(isOrderPaid);
    }
    return sortHubOrders(list);
  }, [orders, filter]);

  return {
    orders,
    filtered,
    stats,
    filter,
    setFilter,
    loading,
    refreshing,
    error,
    refresh,
  };
}

export interface FloorAttentionCounts {
  walkInUnpaid: number;
  staffUnpaid: number;
  onlineOpen: number;
}

export function useFloorAttentionCounts(): FloorAttentionCounts & {
  refresh: () => Promise<void>;
} {
  const [counts, setCounts] = useState<FloorAttentionCounts>({
    walkInUnpaid: 0,
    staffUnpaid: 0,
    onlineOpen: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetchTodayOrders();
      if (!response.success || !response.data) {
        return;
      }
      let walkInUnpaid = 0;
      let staffUnpaid = 0;
      let onlineOpen = 0;
      for (const order of response.data) {
        if (!isOrderOpen(order)) {
          continue;
        }
        const source = String(order.source || '').toUpperCase();
        if (source === 'WALK_IN') {
          walkInUnpaid += 1;
        } else if (source === 'STAFF') {
          staffUnpaid += 1;
        } else if (source === 'ONLINE') {
          onlineOpen += 1;
        }
      }
      setCounts({walkInUnpaid, staffUnpaid, onlineOpen});
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = socketClient.getInstance();
    if (!socket) {
      return;
    }
    const onChange = () => {
      void refresh();
    };
    socket.on('order:created', onChange);
    socket.on('order:updated', onChange);
    socket.on('payment:completed', onChange);
    return () => {
      socket.off('order:created', onChange);
      socket.off('order:updated', onChange);
      socket.off('payment:completed', onChange);
    };
  }, [refresh]);

  return {...counts, refresh};
}
