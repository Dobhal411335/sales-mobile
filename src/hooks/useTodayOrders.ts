import {useCallback, useState} from 'react';
import {
  approveOnlineOrder,
  markOnlineReady,
  sendOnlineKot,
  waiveTodayOrder,
} from '../services/todayOrdersService';
import {useTodayOrdersStore} from '../store/todayOrdersStore';
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

export function useTodayOrders(): UseTodayOrdersResult {
  const orders = useTodayOrdersStore((s) => s.orders);
  const loading = useTodayOrdersStore((s) => s.loading);
  const refreshing = useTodayOrdersStore((s) => s.refreshing);
  const error = useTodayOrdersStore((s) => s.error);
  const fetch = useTodayOrdersStore((s) => s.fetch);
  const mergeOrder = useTodayOrdersStore((s) => s.mergeOrder);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  // Shared store hydrates once; TodaySales focus effect does silent refresh.
  // Avoid duplicate mount+focus fetch storms.

  const refresh = useCallback(
    async (options?: {silent?: boolean}) => {
      await fetch({silent: options?.silent ?? false});
    },
    [fetch],
  );

  const waiveOrder = useCallback(
    async (orderId: string, reason: string) => {
      const result = await waiveTodayOrder(orderId, reason);
      if (result.success && result.data) {
        mergeOrder(orderId, result.data);
      }
      return result;
    },
    [mergeOrder],
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
          mergeOrder(orderId, result.data);
        }
        return result;
      } finally {
        setActionOrderId(null);
      }
    },
    [mergeOrder],
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
