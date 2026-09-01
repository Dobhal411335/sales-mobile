import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {DayCloseBlockerCard} from '../../../components/day-close/DayCloseBlockerCard';
import {DayCloseBookedTables} from '../../../components/day-close/DayCloseBookedTables';
import {DayClosePendingOrders} from '../../../components/day-close/DayClosePendingOrders';
import {colors} from '../../../constants/colors';
import type {SalesStackParamList} from '../../../navigation/types';
import type {
  DayCloseBlockers,
  DayCloseBookedTable,
  DayClosePendingOrder,
} from '../../../types/dayClose';

interface DayCloseBlockedProps {
  blockers: DayCloseBlockers;
  navigation: NativeStackNavigationProp<SalesStackParamList, 'DayClose'>;
  onCancel: () => void;
}

export function DayCloseBlocked({
  blockers,
  navigation,
  onCancel,
}: DayCloseBlockedProps) {
  const {width} = useWindowDimensions();
  const twoColumn = width >= 900;

  const hasPending = blockers.pendingOrderCount > 0;
  const hasBooked = blockers.bookedTableCount > 0;

  const handleOrderPress = (_order: DayClosePendingOrder) => {
    navigation.navigate('Orders');
  };

  const handleTablePress = (_table: DayCloseBookedTable) => {
    navigation.navigate('Floor');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.warningIcon}>
          <Text style={styles.warningIconText}>⚠</Text>
        </View>
        <Text style={styles.heroTitle}>Cannot close restaurant</Text>
        <Text style={styles.heroSubtitle}>
          Resolve the following before closing the day.
        </Text>
        <Text style={styles.heroHint}>
          Settle every pending order and release every booked table before day
          close.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Blocking conditions</Text>

      <View style={[styles.columns, !twoColumn && styles.columnsStacked]}>
        {hasPending ? (
          <DayCloseBlockerCard
            title={`Pending Order${blockers.pendingOrderCount === 1 ? '' : 's'}`}
            count={blockers.pendingOrderCount}
            tone="warning">
            <DayClosePendingOrders
              orders={blockers.pendingOrders}
              totalCount={blockers.pendingOrderCount}
              onOrderPress={handleOrderPress}
              onGoToOrders={() => navigation.navigate('Orders')}
            />
          </DayCloseBlockerCard>
        ) : null}

        {hasBooked ? (
          <DayCloseBlockerCard
            title={`Booked Table${blockers.bookedTableCount === 1 ? '' : 's'}`}
            count={blockers.bookedTableCount}
            tone="danger">
            <DayCloseBookedTables
              tables={blockers.bookedTables}
              totalCount={blockers.bookedTableCount}
              onTablePress={handleTablePress}
              onGoToFloor={() => navigation.navigate('Floor')}
            />
          </DayCloseBlockerCard>
        ) : null}
      </View>

      <View style={styles.footerActions}>
        <Pressable
          style={({pressed}) => [
            styles.cancelButton,
            pressed && styles.cancelButtonPressed,
          ]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel">
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
    gap: 20,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  warningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  warningIconText: {
    fontSize: 28,
    color: colors.warning,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heroHint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 560,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  columns: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
  },
  columnsStacked: {
    flexDirection: 'column',
  },
  footerActions: {
    alignItems: 'center',
    paddingTop: 8,
  },
  cancelButton: {
    minHeight: 48,
    minWidth: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cancelButtonPressed: {
    backgroundColor: colors.cream,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
