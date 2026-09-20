import {useCallback, useEffect, useState} from 'react';
import {
  approveOnlineOrder,
  fetchTodayOrders,
  markOnlineReady,
  sendOnlineKot,
  waiveTodayOrder,
} from '../services/todayOrdersService';
import type {TodayOrder} from '../types/todayOrder';

interface OnlineActionResult {
  success: boolean;
  message?: string;
  data?: TodayOrder & {kotJobId?: string};
}

interface UseTodayOrdersResult {
  orders: TodayOrder[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  actionOrderId: string | null;
  refresh: (options?: {silent?: boolean}) => Promise<void>;
  waiveOrder: (
    orderId: string,
    reason: string,
  ) => Promise<{
    success: boolean;
    message?: string;
    data?: TodayOrder & {sessionReleased?: boolean};
  }>;
  approveOnline: (orderId: string) => Promise<OnlineActionResult>;
  sendKot: (orderId: string) => Promise<OnlineActionResult>;
  markReady: (orderId: string) => Promise<OnlineActionResult>;
}

function mergeOrder(
  prev: TodayOrder[],
  orderId: string,
  next: TodayOrder,
): TodayOrder[] {
  return prev.map((order) =>
    order._id === orderId ? {...order, ...next} : order,
  );
}

export function useTodayOrders(): UseTodayOrdersResult {
  const [orders, setOrders] = useState<TodayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

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
        setOrders((prev) => mergeOrder(prev, orderId, result.data!));
      }
      return result;
    },
    [],
  );

  const runOnlineAction = useCallback(
    async (
      orderId: string,
      action: (id: string) => Promise<OnlineActionResult>,
    ) => {
      setActionOrderId(orderId);
      try {
        const result = await action(orderId);
        if (result.success && result.data) {
          setOrders((prev) => mergeOrder(prev, orderId, result.data!));
        }
        return result;
      } finally {
        setActionOrderId(null);
      }
    },
    [],
  );

  const approveOnline = useCallback(
    (orderId: string) => runOnlineAction(orderId, approveOnlineOrder),
    [runOnlineAction],
  );

  const sendKot = useCallback(
    (orderId: string) => runOnlineAction(orderId, sendOnlineKot),
    [runOnlineAction],
  );

  const markReady = useCallback(
    (orderId: string) => runOnlineAction(orderId, markOnlineReady),
    [runOnlineAction],
  );

  return {
    orders,
    loading,
    refreshing,
    error,
    actionOrderId,
    refresh,
    waiveOrder,
    approveOnline,
    sendKot,
    markReady,
  };
}
