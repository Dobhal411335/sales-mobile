import {create} from 'zustand';
import {fetchTodayReservations} from '../services/reservationService';
import type {TableReservation} from '../types/reservation';
import {perfTimed} from '../utils/perfLog';

interface ReservationsState {
  rows: TableReservation[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetch: (options?: {silent?: boolean}) => Promise<void>;
  upsert: (row: TableReservation) => void;
}

let inflight: Promise<void> | null = null;

export const useReservationsStore = create<ReservationsState>((set, get) => ({
  rows: [],
  loading: true,
  refreshing: false,
  error: null,
  lastFetchedAt: null,

  upsert: (row) => {
    const prev = get().rows;
    const key = row.id || row._id;
    const idx = prev.findIndex((r) => r.id === key || r._id === key);
    if (idx === -1) {
      set({rows: [row, ...prev]});
      return;
    }
    const next = [...prev];
    next[idx] = {...next[idx], ...row};
    set({rows: next});
  },

  fetch: async (options) => {
    const silent = options?.silent ?? false;
    const hasCache = get().rows.length > 0 || get().lastFetchedAt != null;

    if (inflight) {
      return inflight;
    }

    if (silent || hasCache) {
      set({refreshing: true, error: null});
    } else {
      set({loading: true, error: null});
    }

    inflight = (async () => {
      try {
        const response = await perfTimed('fetchTodayReservations', () =>
          fetchTodayReservations(),
        );
        if (!response.success || !response.data) {
          set({
            error: response.message || 'Failed to load bookings',
          });
          return;
        }
        set({
          rows: response.data,
          lastFetchedAt: Date.now(),
          error: null,
        });
      } catch {
        set({error: 'Unable to load bookings. Check your connection.'});
      } finally {
        set({loading: false, refreshing: false});
        inflight = null;
      }
    })();

    return inflight;
  },
}));
