import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {fetchFloorData} from '../services/floorService';
import {fetchOnlineStaff} from '../services/onlineStaffService';
import type {OnlineStaffMember} from '../services/onlineStaffService';
import type {FloorData, GridMode} from '../types/table';
import {perfTimed} from '../utils/perfLog';

const SALES_FLOOR_STORAGE_KEY = 'sales-active-floor-id';

interface FloorStoreState {
  floorData: FloorData | null;
  selectedFloorId: string | null;
  gridMode: GridMode;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onlineStaffCount: number;
  onlineStaff: OnlineStaffMember[];
  hasLoaded: boolean;
  loadFloor: (
    floorIdOverride?: string,
    options?: {silent?: boolean},
  ) => Promise<void>;
  loadOnlineStaff: () => Promise<void>;
  selectFloor: (floorId: string) => void;
  setGridMode: (mode: GridMode) => void;
  cycleGridMode: () => void;
  bootstrap: () => Promise<void>;
}

async function readStoredFloorId(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(SALES_FLOOR_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

async function storeFloorId(floorId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SALES_FLOOR_STORAGE_KEY, floorId);
  } catch {
    // Non-blocking
  }
}

let floorInflight: Promise<void> | null = null;

export const useFloorStore = create<FloorStoreState>((set, get) => ({
  floorData: null,
  selectedFloorId: null,
  gridMode: 'lines',
  loading: true,
  refreshing: false,
  error: null,
  onlineStaffCount: 0,
  onlineStaff: [],
  hasLoaded: false,

  setGridMode: (mode) => set({gridMode: mode}),

  cycleGridMode: () => {
    const prev = get().gridMode;
    const next =
      prev === 'lines' ? 'dots' : prev === 'dots' ? 'none' : 'lines';
    set({gridMode: next});
  },

  loadOnlineStaff: async () => {
    try {
      const snapshot = await fetchOnlineStaff();
      set({
        onlineStaffCount: snapshot.count,
        onlineStaff: snapshot.online,
      });
    } catch {
      // Non-blocking
    }
  },

  loadFloor: async (floorIdOverride, options) => {
    if (floorInflight && options?.silent) {
      return floorInflight;
    }

    const isInitial = !get().hasLoaded;
    if (isInitial) {
      set({loading: true, error: null});
    } else if (!options?.silent) {
      set({refreshing: true, error: null});
    } else {
      set({error: null});
    }

    const run = (async () => {
      try {
        const storedFloorId = await readStoredFloorId();
        const preferredFloorId =
          floorIdOverride ||
          get().selectedFloorId ||
          storedFloorId ||
          undefined;

        const data = await perfTimed('fetchFloorData', () =>
          fetchFloorData(preferredFloorId),
        );
        const nextFloorId = data.activeFloorId || data.floors[0]?.id || null;
        if (nextFloorId) {
          void storeFloorId(nextFloorId);
        }
        set({
          floorData: data,
          selectedFloorId: nextFloorId,
          error: null,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load floor. Check your connection and try again.';
        set({error: message});
      } finally {
        set({loading: false, refreshing: false, hasLoaded: true});
        floorInflight = null;
      }
    })();

    floorInflight = run;
    return run;
  },

  selectFloor: (floorId) => {
    if (!floorId || floorId === get().selectedFloorId) {
      return;
    }
    set({selectedFloorId: floorId});
    void storeFloorId(floorId);
    void get().loadFloor(floorId);
  },

  bootstrap: async () => {
    const stored = await readStoredFloorId();
    if (stored) {
      set({selectedFloorId: stored});
    }
    // Parallel cold start: floor + online staff
    await Promise.all([
      get().loadFloor(stored || undefined),
      get().loadOnlineStaff(),
    ]);
  },
}));
