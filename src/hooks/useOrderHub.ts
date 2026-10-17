import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTodayOrdersStore} from '../store/todayOrdersStore';
import {fetchUpcomingOffersCount} from '../services/upcomingOffersService';
import {socketClient} from '../socket/socket';
import type {TodayOrder, TodayOrderSource} from '../types/todayOrder';
import {
  getOrderGrandTotal,
  isOrderOpen,
  isOrderPaid,
} from '../utils/todayOrderHelpers';
import {createDebouncedCallback} from '../utils/debounce';

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

const SOCKET_DEBOUNCE_MS = 800;

export function useOrderHub(source: TodayOrderSource): UseOrderHubResult {
  const allOrders = useTodayOrdersStore((s) => s.orders);
  const loading = useTodayOrdersStore((s) => s.loading);
  const refreshing = useTodayOrdersStore((s) => s.refreshing);
  const error = useTodayOrdersStore((s) => s.error);
  const fetch = useTodayOrdersStore((s) => s.fetch);
  const [filter, setFilter] = useState<HubFilter>('OPEN');

  const orders = useMemo(() => {
    const sourceKey = String(source).toUpperCase();
    return allOrders.filter(
      (order) => String(order.source || '').toUpperCase() === sourceKey,
    );
  }, [allOrders, source]);

  const refresh = useCallback(
    async (options?: {silent?: boolean}) => {
      await fetch({silent: options?.silent ?? false});
    },
    [fetch],
  );

  useEffect(() => {
    void fetch({silent: allOrders.length > 0});
  }, [fetch, allOrders.length]);

  useEffect(() => {
    const socket = socketClient.getInstance();
    if (!socket) {
      return;
    }
    const debounced = createDebouncedCallback(() => {
      void fetch({silent: true});
    }, SOCKET_DEBOUNCE_MS);
    const onChange = () => debounced.run();
    socket.on('order:created', onChange);
    socket.on('order:updated', onChange);
    socket.on('payment:completed', onChange);
    return () => {
      debounced.cancel();
      socket.off('order:created', onChange);
      socket.off('order:updated', onChange);
      socket.off('payment:completed', onChange);
    };
  }, [fetch]);

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

export type {FloorAttentionCounts} from '../store/todayOrdersStore';

export function useFloorAttentionCounts(): import('../store/todayOrdersStore').FloorAttentionCounts & {
  refresh: () => Promise<void>;
} {
  const attention = useTodayOrdersStore((s) => s.attention);
  const fetch = useTodayOrdersStore((s) => s.fetch);
  const setUpcomingOffersCount = useTodayOrdersStore(
    (s) => s.setUpcomingOffersCount,
  );

  const refreshUpcoming = useCallback(async () => {
    const result = await fetchUpcomingOffersCount();
    if (result.success && result.data) {
      setUpcomingOffersCount(Number(result.data.pendingCount) || 0);
    }
  }, [setUpcomingOffersCount]);

  const refresh = useCallback(async () => {
    await Promise.all([fetch({silent: true}), refreshUpcoming()]);
  }, [fetch, refreshUpcoming]);

  useEffect(() => {
    void fetch({silent: true});
    void refreshUpcoming();
  }, [fetch, refreshUpcoming]);

  useEffect(() => {
    const socket = socketClient.getInstance();
    if (!socket) {
      return;
    }
    const debounced = createDebouncedCallback(() => {
      void fetch({silent: true});
      void refreshUpcoming();
    }, SOCKET_DEBOUNCE_MS);
    const onChange = () => debounced.run();
    socket.on('order:created', onChange);
    socket.on('order:updated', onChange);
    socket.on('payment:completed', onChange);
    return () => {
      debounced.cancel();
      socket.off('order:created', onChange);
      socket.off('order:updated', onChange);
      socket.off('payment:completed', onChange);
    };
  }, [fetch, refreshUpcoming]);

  return {...attention, refresh};
}
