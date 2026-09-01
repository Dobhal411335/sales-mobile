import {useCallback, useEffect, useMemo, useState} from 'react';
import type {Floor, FloorData, GridMode} from '../types/table';
import {fetchFloorData} from '../services/floorService';

interface UseFloorDataResult {
  floors: Floor[];
  activeFloor: Floor | null;
  tables: FloorData['tables'];
  sessions: FloorData['sessions'];
  selectedFloorId: string | null;
  gridMode: GridMode;
  loading: boolean;
  error: string | null;
  onlineStaffCount: number;
  notificationCount: number;
  tableCount: number;
  activeSessionCount: number;
  activeOrderCount: number;
  setGridMode: (mode: GridMode) => void;
  cycleGridMode: () => void;
  selectFloor: (floorId: string) => void;
  reload: () => void;
}

export function useFloorData(): UseFloorDataResult {
  const [floorData, setFloorData] = useState<FloorData | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [gridMode, setGridMode] = useState<GridMode>('lines');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFloor = useCallback(async (floorId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFloorData(floorId);
      setFloorData(data);
      setSelectedFloorId(data.activeFloorId);
    } catch {
      setError('Unable to load tables. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFloor();
  }, [loadFloor]);

  const selectFloor = useCallback(
    (floorId: string) => {
      if (!floorId || floorId === selectedFloorId) {
        return;
      }
      loadFloor(floorId);
    },
    [loadFloor, selectedFloorId],
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
    error,
    onlineStaffCount: floorData?.onlineStaffCount ?? 0,
    notificationCount: floorData?.notificationCount ?? 0,
    tableCount,
    activeSessionCount,
    activeOrderCount,
    setGridMode,
    cycleGridMode,
    selectFloor,
    reload: () => loadFloor(selectedFloorId ?? undefined),
  };
}
