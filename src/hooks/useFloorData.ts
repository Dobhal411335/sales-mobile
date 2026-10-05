import {useCallback, useEffect, useMemo} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import type {Floor, FloorData, GridMode} from '../types/table';
import {useFloorStore} from '../store/floorStore';

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
  onlineStaff: ReturnType<typeof useFloorStore.getState>['onlineStaff'];
  tableCount: number;
  activeSessionCount: number;
  activeOrderCount: number;
  setGridMode: (mode: GridMode) => void;
  cycleGridMode: () => void;
  selectFloor: (floorId: string) => void;
  reload: () => void;
  retry: () => void;
}

export function useFloorData(): UseFloorDataResult {
  const floorData = useFloorStore((s) => s.floorData);
  const selectedFloorId = useFloorStore((s) => s.selectedFloorId);
  const gridMode = useFloorStore((s) => s.gridMode);
  const loading = useFloorStore((s) => s.loading);
  const refreshing = useFloorStore((s) => s.refreshing);
  const error = useFloorStore((s) => s.error);
  const onlineStaffCount = useFloorStore((s) => s.onlineStaffCount);
  const onlineStaff = useFloorStore((s) => s.onlineStaff);
  const bootstrap = useFloorStore((s) => s.bootstrap);
  const loadFloor = useFloorStore((s) => s.loadFloor);
  const loadOnlineStaff = useFloorStore((s) => s.loadOnlineStaff);
  const selectFloor = useFloorStore((s) => s.selectFloor);
  const setGridMode = useFloorStore((s) => s.setGridMode);
  const cycleGridMode = useFloorStore((s) => s.cycleGridMode);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadOnlineStaff();
    }, ONLINE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadOnlineStaff]);

  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void loadFloor(undefined, {silent: true});
        void loadOnlineStaff();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [loadFloor, loadOnlineStaff]);

  const reload = useCallback(() => {
    void loadFloor(undefined, {silent: true});
  }, [loadFloor]);

  const retry = useCallback(() => {
    void loadFloor();
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
    onlineStaff,
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
