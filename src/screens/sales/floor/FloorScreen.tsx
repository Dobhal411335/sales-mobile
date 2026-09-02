import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FloorCanvas} from '../../../components/floor/FloorCanvas';
import {FloorHeader} from '../../../components/floor/FloorHeader';
import {FloorToolbar} from '../../../components/floor/FloorToolbar';
import {StartSessionModal} from '../../../components/floor/StartSessionModal';
import {TableReadonlySheet} from '../../../components/floor/TableReadonlySheet';
import {colors} from '../../../constants/colors';
import {useAuth} from '../../../hooks/useAuth';
import {useFloorData} from '../../../hooks/useFloorData';
import {useFloorRealtime} from '../../../hooks/useFloorRealtime';
import type {OrderType, SalesStackParamList} from '../../../navigation/types';
import type {FloorTable, TableSession} from '../../../types/table';
import {
  resolveTableDisplayStatus,
} from '../../../utils/tableStatus';

type Props = NativeStackScreenProps<SalesStackParamList, 'Floor'>;

export function FloorScreen({navigation}: Props) {
  const {user} = useAuth();
  const {
    floors,
    activeFloor,
    tables,
    sessions,
    selectedFloorId,
    gridMode,
    loading,
    refreshing,
    error,
    onlineStaffCount,
    tableCount,
    activeSessionCount,
    activeOrderCount,
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

  const handleTablePress = useCallback(
    (table: FloorTable, session: TableSession | null) => {
      setSelectedTableId(table.id);
      const status = resolveTableDisplayStatus(session, user?.id ?? null);

      if (!session) {
        setStartSessionTable(table);
        return;
      }

      if (status === 'BOOKED') {
        setReadonlyTable(table);
        setReadonlySession(session);
        return;
      }

      navigation.navigate('CreateOrder', {
        orderType: 'table',
        tableId: table.id,
        sessionId: session.id,
      });
    },
    [navigation, user?.id],
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <FloorHeader
        floorName={activeFloor?.name ?? 'Floor'}
        tableCount={tableCount}
        activeSessionCount={activeSessionCount}
        activeOrderCount={activeOrderCount}
        floors={floors}
        selectedFloorId={selectedFloorId}
        gridMode={gridMode}
        onSelectFloor={selectFloor}
        onToggleGrid={cycleGridMode}
      />

      <FloorToolbar
        onlineStaffCount={onlineStaffCount}
        connectionStatus={connectionStatus}
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
        currentUserId={user?.id ?? null}
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
        onClose={() => setStartSessionTable(null)}
        onSessionStarted={handleSessionStarted}
      />

      <TableReadonlySheet
        visible={Boolean(readonlyTable)}
        table={readonlyTable}
        session={readonlySession}
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
