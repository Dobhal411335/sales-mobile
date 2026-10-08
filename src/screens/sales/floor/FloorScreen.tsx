import React, {useCallback, useEffect, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useIsFocused} from '@react-navigation/native';
import {FloorAttentionPanel} from '../../../components/floor/FloorAttentionPanel';
import {FloorCanvas} from '../../../components/floor/FloorCanvas';
import {
  FloorHeader,
  type FloorOrderShortcut,
} from '../../../components/floor/FloorHeader';
import {StartSessionModal} from '../../../components/floor/StartSessionModal';
import {TableActionsSheet} from '../../../components/floor/TableActionsSheet';
import {TableReadonlySheet} from '../../../components/floor/TableReadonlySheet';
import {NetworkErrorState} from '../../../components/common/NetworkErrorState';
import {colors} from '../../../constants/colors';
import {useAuth} from '../../../hooks/useAuth';
import {useFloorData} from '../../../hooks/useFloorData';
import {useFloorRealtime} from '../../../hooks/useFloorRealtime';
import {useFloorAttentionCounts} from '../../../hooks/useOrderHub';
import {
  navigateFast,
  prefetchFloorDestinations,
  prefetchSalesScreen,
} from '../../../navigation/prefetchSalesScreens';
import type {SalesStackParamList} from '../../../navigation/types';
import type {FloorTable, TableSession} from '../../../types/table';
import {canOverrideFloorSession} from '../../../utils/floorRoles';
import {isSessionOwnedByUser} from '../../../utils/tableStatus';

type Props = NativeStackScreenProps<SalesStackParamList, 'Floor'>;

export function FloorScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  const showAttentionRail = width >= 780;
  const isFocused = useIsFocused();
  const {user} = useAuth();
  const {
    floors,
    activeFloor,
    tables,
    sessions,
    tableCount,
    activeSessionCount,
    activeOrderCount,
    selectedFloorId,
    gridMode,
    loading,
    refreshing,
    error,
    onlineStaffCount,
    onlineStaff,
    cycleGridMode,
    selectFloor,
    reload,
    retry,
  } = useFloorData();

  // Warm destination modules while staff is on Floor so taps open instantly.
  useEffect(() => {
    if (!isFocused) {
      return;
    }
    return prefetchFloorDestinations();
  }, [isFocused]);

  const focusedReload = useCallback(() => {
    if (isFocused) {
      reload();
    }
  }, [isFocused, reload]);

  const {connectionStatus} = useFloorRealtime(selectedFloorId, focusedReload);
  const {takeAwayUnpaid, staffUnpaid, onlineOpen} = useFloorAttentionCounts();

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [startSessionTable, setStartSessionTable] = useState<FloorTable | null>(
    null,
  );
  const [readonlyTable, setReadonlyTable] = useState<FloorTable | null>(null);
  const [readonlySession, setReadonlySession] = useState<TableSession | null>(
    null,
  );
  const [actionsTable, setActionsTable] = useState<FloorTable | null>(null);
  const [actionsSession, setActionsSession] = useState<TableSession | null>(
    null,
  );

  const currentUserId = user?.id ?? null;
  const canAdminOverride = canOverrideFloorSession(user?.role);
  const attention = {takeAwayUnpaid, staffUnpaid, onlineOpen};

  const handleTablePress = useCallback(
    (table: FloorTable, session: TableSession | null) => {
      setSelectedTableId(table.id);

      if (!session) {
        // Prefetch CreateOrder while seating modal is open.
        prefetchSalesScreen('CreateOrder');
        setStartSessionTable(table);
        return;
      }

      const isMine = isSessionOwnedByUser(session, currentUserId);
      const isPaid = session.status === 'PAYMENT_PENDING';

      if (isMine || canAdminOverride || isPaid) {
        prefetchSalesScreen('CreateOrder');
        setActionsTable(table);
        setActionsSession(session);
        return;
      }

      setReadonlyTable(table);
      setReadonlySession(session);
    },
    [canAdminOverride, currentUserId],
  );

  const handleSessionStarted = useCallback(
    (
      sessionId: string,
      tableId: string,
      meta?: {
        guestCount: number;
        tableNumber?: string;
        floorName?: string | null;
      },
    ) => {
      setStartSessionTable(null);
      navigateFast(navigation, 'CreateOrder', {
        orderType: 'table',
        tableId,
        sessionId,
        freshSession: true,
        seedGuestCount: meta?.guestCount,
        seedTableNumber: meta?.tableNumber,
        seedFloorName: meta?.floorName ?? activeFloor?.name,
        seedFloorId: activeFloor?.id,
      });
      void reload();
    },
    [navigation, activeFloor?.name, activeFloor?.id, reload],
  );

  const handleContinueOrder = useCallback(
    (sessionId: string, tableId: string) => {
      setActionsTable(null);
      setActionsSession(null);
      navigateFast(navigation, 'CreateOrder', {
        orderType: 'table',
        tableId,
        sessionId,
      });
    },
    [navigation],
  );

  const handleSelectOrderType = useCallback(
    (orderType: FloorOrderShortcut) => {
      if (orderType === 'online') {
        navigateFast(navigation, 'Orders', {filter: 'ONLINE'});
        return;
      }
      if (orderType === 'takeaway') {
        navigateFast(navigation, 'TakeAwayHub');
        return;
      }
      navigateFast(navigation, 'StaffHub');
    },
    [navigation],
  );

  const handleAdminOverrideFromReadonly = useCallback(() => {
    if (!readonlyTable || !readonlySession) {
      return;
    }
    setReadonlyTable(null);
    setReadonlySession(null);
    setActionsTable(readonlyTable);
    setActionsSession(readonlySession);
  }, [readonlyTable, readonlySession]);


  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <FloorHeader
        floors={floors}
        activeFloor={activeFloor}
        tableCount={tableCount}
        activeSessionCount={activeSessionCount}
        activeOrderCount={activeOrderCount}
        selectedFloorId={selectedFloorId}
        gridMode={gridMode}
        onlineStaffCount={onlineStaffCount}
        onlineStaff={onlineStaff}
        connectionStatus={connectionStatus}
        attention={attention}
        refreshing={refreshing}
        onSelectFloor={selectFloor}
        onToggleGrid={cycleGridMode}
        onSelectOrderType={handleSelectOrderType}
        onRefresh={() => {
          void reload();
        }}
      />

      {error ? (
        <NetworkErrorState
          compact
          title="Unable to load floor"
          message={error}
          onRetry={retry}
          retryLabel="Retry"
        />
      ) : null}

      <View style={styles.body}>
        <View style={styles.canvasWrap}>
          <FloorCanvas
            activeFloor={activeFloor}
            tables={tables}
            sessions={sessions}
            gridMode={gridMode}
            currentUserId={currentUserId}
            selectedTableId={selectedTableId}
            loading={loading}
            refreshing={refreshing}
            hasFloors={floors.length > 0}
            onTablePress={handleTablePress}
          />
        </View>

        {showAttentionRail ? (
          <FloorAttentionPanel
            attention={attention}
            onSelect={handleSelectOrderType}
          />
        ) : null}
      </View>

      {!showAttentionRail ? (
        <View style={styles.mobileAttention}>
          <FloorAttentionPanel
            attention={attention}
            onSelect={handleSelectOrderType}
            layout="sheet"
          />
        </View>
      ) : null}

      {startSessionTable ? (
        <StartSessionModal
          visible={Boolean(startSessionTable)}
          table={startSessionTable}
          floorName={activeFloor?.name}
          tables={tables}
          sessions={sessions}
          currentUserId={currentUserId}
          onClose={() => setStartSessionTable(null)}
          onSessionStarted={handleSessionStarted}
        />
      ) : null}

      {actionsTable && actionsSession ? (
        <TableActionsSheet
          visible={Boolean(actionsTable && actionsSession)}
          table={actionsTable}
          session={actionsSession}
          floorName={activeFloor?.name}
          tables={tables}
          sessions={sessions}
          currentUserId={currentUserId}
          onClose={() => {
            setActionsTable(null);
            setActionsSession(null);
          }}
          onContinueOrder={handleContinueOrder}
          onSessionUpdated={reload}
        />
      ) : null}

      {readonlyTable ? (
        <TableReadonlySheet
          visible={Boolean(readonlyTable)}
          table={readonlyTable}
          session={readonlySession}
          showAdminOverride={canAdminOverride}
          onAdminOverride={handleAdminOverrideFromReadonly}
          onClose={() => {
            setReadonlyTable(null);
            setReadonlySession(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  canvasWrap: {
    flex: 1,
    minWidth: 0,
  },
  mobileAttention: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: 300,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  retryButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonPressed: {
    opacity: 0.9,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface,
  },
});
