import {useCallback, useEffect, useState} from 'react';
import {
  fetchTodayOrders,
  waiveTodayOrder,
} from '../services/todayOrdersService';
import type {TodayOrder} from '../types/todayOrder';

interface UseTodayOrdersResult {
  orders: TodayOrder[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: (options?: {silent?: boolean}) => Promise<void>;
  waiveOrder: (
    orderId: string,
    reason: string,
  ) => Promise<{
    success: boolean;
    message?: string;
    data?: TodayOrder & {sessionReleased?: boolean};
  }>;
}

export function useTodayOrders(): UseTodayOrdersResult {
  const [orders, setOrders] = useState<TodayOrder[]>([]);
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
        setOrders(response.data);
      } else {
        setError(
          "Unable to load today's orders. Check your connection and try again.",
        );
      }
    } catch {
      setError(
        "Unable to load today's orders. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const waiveOrder = useCallback(
    async (orderId: string, reason: string) => {
      const result = await waiveTodayOrder(orderId, reason);
      if (result.success && result.data) {
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId ? {...order, ...result.data!} : order,
          ),
        );
      }
      return result;
    },
    [],
  );

  return {
    orders,
    loading,
    refreshing,
    error,
    refresh,
    waiveOrder,
  };
}
