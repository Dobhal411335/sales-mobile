import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FloorCanvas} from '../../../components/floor/FloorCanvas';
import {FloorHeader} from '../../../components/floor/FloorHeader';
import {FloorToolbar} from '../../../components/floor/FloorToolbar';
import {colors} from '../../../constants/colors';
import {useAuth} from '../../../hooks/useAuth';
import {useFloorData} from '../../../hooks/useFloorData';
import type {OrderType, SalesStackParamList} from '../../../navigation/types';
import type {FloorTable, TableSession} from '../../../types/table';

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
    error,
    onlineStaffCount,
    tableCount,
    activeSessionCount,
    activeOrderCount,
    cycleGridMode,
    selectFloor,
  } = useFloorData();

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const handleTablePress = useCallback(
    (table: FloorTable, session: TableSession | null) => {
      setSelectedTableId(table.id);

      if (session) {
        navigation.navigate('CreateOrder', {
          orderType: 'table',
          tableId: table.id,
          sessionId: session.id,
        });
        return;
      }

      navigation.navigate('CreateOrder', {
        orderType: 'table',
        tableId: table.id,
      });
    },
    [navigation],
  );

  const handleSelectOrderType = useCallback(
    (orderType: OrderType) => {
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
        onSelectOrderType={handleSelectOrderType}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
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
        onTablePress={handleTablePress}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
});
