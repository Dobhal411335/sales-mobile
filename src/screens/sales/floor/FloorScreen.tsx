import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FloorCanvas} from '../../../components/floor/FloorCanvas';
import {FloorHeader} from '../../../components/floor/FloorHeader';
import {StartSessionModal} from '../../../components/floor/StartSessionModal';
import {TableActionsSheet} from '../../../components/floor/TableActionsSheet';
import {TableReadonlySheet} from '../../../components/floor/TableReadonlySheet';
import {colors} from '../../../constants/colors';
import {useAuth} from '../../../hooks/useAuth';
import {useFloorData} from '../../../hooks/useFloorData';
import {useFloorRealtime} from '../../../hooks/useFloorRealtime';
import type {OrderType, SalesStackParamList} from '../../../navigation/types';
import type {FloorTable, TableSession} from '../../../types/table';
import {canOverrideFloorSession} from '../../../utils/floorRoles';
import {
  isSessionOwnedByUser,
} from '../../../utils/tableStatus';

type Props = NativeStackScreenProps<SalesStackParamList, 'Floor'>;

export function FloorScreen({navigation}: Props) {
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

  const {connectionStatus} = useFloorRealtime(selectedFloorId, reload);

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

  const handleTablePress = useCallback(
    (table: FloorTable, session: TableSession | null) => {
      setSelectedTableId(table.id);

      if (!session) {
        setStartSessionTable(table);
        return;
      }

      const isMine = isSessionOwnedByUser(session, currentUserId);
      const isPaid = session.status === 'PAYMENT_PENDING';

      if (isMine || canAdminOverride || isPaid) {
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
    (sessionId: string, tableId: string) => {
      setStartSessionTable(null);
      navigation.navigate('CreateOrder', {
        orderType: 'table',
        tableId,
        sessionId,
      });
    },
    [navigation],
  );

  const handleContinueOrder = useCallback(
    (sessionId: string, tableId: string) => {
      setActionsTable(null);
      setActionsSession(null);
      navigation.navigate('CreateOrder', {
        orderType: 'table',
        tableId,
        sessionId,
      });
    },
    [navigation],
  );

  const handleSelectOrderType = useCallback(
    (orderType: OrderType) => {
      if (orderType === 'online') {
        navigation.navigate('Orders', {filter: 'ONLINE'});
        return;
      }
      navigation.navigate('CreateOrder', {orderType});
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
        onSelectFloor={selectFloor}
        onToggleGrid={cycleGridMode}
        onSelectOrderType={handleSelectOrderType}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({pressed}) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={retry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading floor">
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
