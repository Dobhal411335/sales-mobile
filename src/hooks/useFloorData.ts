import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {Floor, FloorData, GridMode} from '../types/table';
import {fetchFloorData} from '../services/floorService';
import {fetchOnlineStaffCount} from '../services/onlineStaffService';

const SALES_FLOOR_STORAGE_KEY = 'sales-active-floor-id';
const ONLINE_POLL_INTERVAL_MS = 30_000;

interface UseFloorDataResult {
  floors: Floor[];
  activeFloor: Floor | null;
  tables: FloorData['tables'];
  sessions: FloorData['sessions'];
  selectedFloorId: string | null;
  gridMode: GridMode;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onlineStaffCount: number;
  tableCount: number;
  activeSessionCount: number;
  activeOrderCount: number;
  setGridMode: (mode: GridMode) => void;
  cycleGridMode: () => void;
  selectFloor: (floorId: string) => void;
  reload: () => void;
  retry: () => void;
}

async function readStoredFloorId(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(SALES_FLOOR_STORAGE_KEY);
    return value || null;
  } catch {
    return null;
  }
}

async function storeFloorId(floorId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SALES_FLOOR_STORAGE_KEY, floorId);
  } catch {
    // Non-blocking persistence failure.
  }
}

export function useFloorData(): UseFloorDataResult {
  const [floorData, setFloorData] = useState<FloorData | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<GridMode>('lines');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineStaffCount, setOnlineStaffCount] = useState(0);
  const hasLoadedRef = useRef(false);
  const selectedFloorIdRef = useRef<string | null>(null);

  const loadOnlineStaff = useCallback(async () => {
    const count = await fetchOnlineStaffCount();
    setOnlineStaffCount(count);
  }, []);

  const loadFloor = useCallback(
    async (floorIdOverride?: string, options?: {silent?: boolean}) => {
      const isInitial = !hasLoadedRef.current;

      try {
        if (isInitial) {
          setLoading(true);
        } else if (!options?.silent) {
          setRefreshing(true);
        }
        setError(null);

        const storedFloorId = await readStoredFloorId();
        const preferredFloorId =
          floorIdOverride || selectedFloorIdRef.current || storedFloorId || undefined;

        const data = await fetchFloorData(preferredFloorId);
        setFloorData(data);

        const nextFloorId = data.activeFloorId || data.floors[0]?.id || null;
        if (nextFloorId) {
          selectedFloorIdRef.current = nextFloorId;
          setSelectedFloorId(nextFloorId);
          await storeFloorId(nextFloorId);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load floor. Check your connection and try again.';
        setError(message);
      } finally {
        hasLoadedRef.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const init = async () => {
      const stored = await readStoredFloorId();
      if (stored) {
        selectedFloorIdRef.current = stored;
        setSelectedFloorId(stored);
      }
      await loadFloor(stored || undefined);
      await loadOnlineStaff();
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadOnlineStaff();
    }, ONLINE_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [loadOnlineStaff]);

  const selectFloor = useCallback(
    (floorId: string) => {
      if (!floorId || floorId === selectedFloorIdRef.current) {
        return;
      }
      selectedFloorIdRef.current = floorId;
      setSelectedFloorId(floorId);
      void storeFloorId(floorId);
      void loadFloor(floorId);
    },
    [loadFloor],
  );

  const cycleGridMode = useCallback(() => {
    setGridMode((prev) => {
      if (prev === 'lines') {
        return 'dots';
      }
      if (prev === 'dots') {
        return 'none';
      }
      return 'lines';
    });
  }, []);

  const reload = useCallback(() => {
    void loadFloor(selectedFloorIdRef.current ?? undefined, {silent: true});
  }, [loadFloor]);

  const retry = useCallback(() => {
    void loadFloor(selectedFloorIdRef.current ?? undefined);
  }, [loadFloor]);

  const activeFloor = useMemo(() => {
    if (!floorData) {
      return null;
    }
    const floorId = selectedFloorId ?? floorData.activeFloorId;
    return floorData.floors.find((floor) => floor.id === floorId) ?? null;
  }, [floorData, selectedFloorId]);

  const tableCount = floorData?.tables.length ?? 0;
  const activeSessionCount = floorData?.sessions.length ?? 0;
  const activeOrderCount =
    floorData?.sessions.filter((session) => session.hasActiveOrder).length ?? 0;

  return {
    floors: floorData?.floors ?? [],
    activeFloor,
    tables: floorData?.tables ?? [],
    sessions: floorData?.sessions ?? [],
    selectedFloorId,
    gridMode,
    loading,
    refreshing,
    error,
    onlineStaffCount,
    tableCount,
    activeSessionCount,
    activeOrderCount,
    setGridMode,
    cycleGridMode,
    selectFloor,
    reload,
    retry,
  };
}
