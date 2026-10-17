import {create} from 'zustand';
import {fetchTodayOrders} from '../services/todayOrdersService';
import type {TodayOrder} from '../types/todayOrder';
import {isOrderOpen} from '../utils/todayOrderHelpers';
import {perfTimed} from '../utils/perfLog';

export interface FloorAttentionCounts {
  takeAwayUnpaid: number;
  staffUnpaid: number;
  onlineOpen: number;
  upcomingOffers: number;
}

interface TodayOrdersState {
  orders: TodayOrder[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  attention: FloorAttentionCounts;
  fetch: (options?: {silent?: boolean; force?: boolean}) => Promise<void>;
  mergeOrder: (orderId: string, next: TodayOrder) => void;
  setOrders: (orders: TodayOrder[]) => void;
  setUpcomingOffersCount: (count: number) => void;
}

function computeAttention(
  orders: TodayOrder[],
  upcomingOffers = 0,
): FloorAttentionCounts {
  let takeAwayUnpaid = 0;
  let staffUnpaid = 0;
  let onlineOpen = 0;
  for (const order of orders) {
    if (!isOrderOpen(order)) {
      continue;
    }
    const source = String(order.source || '').toUpperCase();
    if (source === 'WALK_IN') {
      takeAwayUnpaid += 1;
    } else if (source === 'STAFF') {
      staffUnpaid += 1;
    } else if (source === 'ONLINE') {
      onlineOpen += 1;
    }
  }
  return {takeAwayUnpaid, staffUnpaid, onlineOpen, upcomingOffers};
}

let inflight: Promise<void> | null = null;

export const useTodayOrdersStore = create<TodayOrdersState>((set, get) => ({
  orders: [],
  loading: true,
  refreshing: false,
  error: null,
  lastFetchedAt: null,
  attention: {
    takeAwayUnpaid: 0,
    staffUnpaid: 0,
    onlineOpen: 0,
    upcomingOffers: 0,
  },

  setOrders: (orders) => {
    const upcomingOffers = get().attention.upcomingOffers;
    set({
      orders,
      attention: computeAttention(orders, upcomingOffers),
      lastFetchedAt: Date.now(),
      loading: false,
      error: null,
    });
  },

  mergeOrder: (orderId, next) => {
    const orders = get().orders.map((order) =>
      order._id === orderId ? {...order, ...next} : order,
    );
    set({
      orders,
      attention: computeAttention(orders, get().attention.upcomingOffers),
    });
  },

  setUpcomingOffersCount: (count) => {
    const next = Number(count) || 0;
    const {orders, attention} = get();
    if (attention.upcomingOffers === next) {
      return;
    }
    set({
      attention: computeAttention(orders, next),
    });
  },

  fetch: async (options) => {
    const silent = options?.silent ?? false;
    const hasCache = get().orders.length > 0 || get().lastFetchedAt != null;

    if (inflight && !options?.force) {
      return inflight;
    }

    if (silent || hasCache) {
      set({refreshing: true, error: null});
    } else {
      set({loading: true, error: null});
    }

    inflight = (async () => {
      try {
        const response = await perfTimed('fetchTodayOrders', () =>
          fetchTodayOrders(),
        );
        if (response.success && response.data) {
          set({
            orders: response.data,
            attention: computeAttention(
              response.data,
              get().attention.upcomingOffers,
            ),
            lastFetchedAt: Date.now(),
            error: null,
          });
        } else {
          set({
            error:
              "Unable to load today's orders. Check your connection and try again.",
          });
        }
      } catch {
        set({
          error:
            "Unable to load today's orders. Check your connection and try again.",
        });
      } finally {
        set({loading: false, refreshing: false});
        inflight = null;
      }
    })();

    return inflight;
  },
}));
