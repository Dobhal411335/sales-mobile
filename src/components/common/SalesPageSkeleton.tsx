import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SkeletonBlock} from './SkeletonBlock';
import {colors} from '../../constants/colors';

export type SalesSkeletonVariant =
  | 'orderList'
  | 'hubList'
  | 'bookingList'
  | 'notificationList'
  | 'printJobList'
  | 'metricCards'
  | 'floorGrid'
  | 'employeeSidebar';

interface SalesPageSkeletonProps {
  variant?: SalesSkeletonVariant;
  rows?: number;
}

function OrderRowSkeleton() {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <SkeletonBlock style={styles.orderTitle} />
        <SkeletonBlock style={styles.orderBadge} />
      </View>
      <SkeletonBlock style={styles.orderLine} />
      <View style={styles.orderBottom}>
        <SkeletonBlock style={styles.orderMeta} />
        <SkeletonBlock style={styles.orderAmount} />
      </View>
    </View>
  );
}

function BookingRowSkeleton() {
  return (
    <View style={styles.bookingCard}>
      <SkeletonBlock style={styles.bookingTime} />
      <View style={styles.bookingBody}>
        <SkeletonBlock style={styles.bookingName} />
        <SkeletonBlock style={styles.bookingMeta} />
      </View>
      <SkeletonBlock style={styles.bookingAction} />
    </View>
  );
}

function MetricStripSkeleton() {
  return (
    <View style={styles.metricRow}>
      {Array.from({length: 4}, (_, i) => (
        <View key={`m-${i}`} style={styles.metricCard}>
          <SkeletonBlock style={styles.metricLabel} />
          <SkeletonBlock style={styles.metricValue} />
        </View>
      ))}
    </View>
  );
}

function FloorTileSkeleton() {
  return <SkeletonBlock style={styles.floorTile} />;
}

function EmployeeRowSkeleton() {
  return (
    <View style={styles.empRow}>
      <SkeletonBlock style={styles.empAvatar} />
      <View style={styles.empBody}>
        <SkeletonBlock style={styles.empName} />
        <SkeletonBlock style={styles.empMeta} />
      </View>
    </View>
  );
}

export function SalesPageSkeleton({
  variant = 'orderList',
  rows = 6,
}: SalesPageSkeletonProps) {
  const keys = useMemo(
    () => Array.from({length: rows}, (_, i) => `sk-${variant}-${i}`),
    [rows, variant],
  );

  if (variant === 'metricCards') {
    return (
      <View style={styles.wrap}>
        <MetricStripSkeleton />
        <View style={styles.listPad}>
          {keys.map((key) => (
            <OrderRowSkeleton key={key} />
          ))}
        </View>
      </View>
    );
  }

  if (variant === 'floorGrid') {
    return (
      <View style={styles.floorGrid}>
        {Array.from({length: 12}, (_, i) => (
          <FloorTileSkeleton key={`ft-${i}`} />
        ))}
      </View>
    );
  }

  if (variant === 'employeeSidebar') {
    return (
      <View style={styles.sidebarPad}>
        {keys.map((key) => (
          <EmployeeRowSkeleton key={key} />
        ))}
      </View>
    );
  }

  if (variant === 'bookingList') {
    return (
      <ScrollView
        style={styles.wrap}
        contentContainerStyle={styles.listPad}
        showsVerticalScrollIndicator={false}>
        {keys.map((key) => (
          <BookingRowSkeleton key={key} />
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.listPad}
      showsVerticalScrollIndicator={false}>
      {(variant === 'hubList' || variant === 'orderList') && (
        <MetricStripSkeleton />
      )}
      {keys.map((key) => (
        <OrderRowSkeleton key={key} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listPad: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  sidebarPad: {
    padding: 12,
    gap: 10,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitle: {
    width: '48%',
    height: 16,
  },
  orderBadge: {
    width: 72,
    height: 22,
    borderRadius: 11,
  },
  orderLine: {
    width: '70%',
    height: 12,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderMeta: {
    width: '40%',
    height: 12,
  },
  orderAmount: {
    width: 64,
    height: 16,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  bookingTime: {
    width: 56,
    height: 40,
    borderRadius: 10,
  },
  bookingBody: {
    flex: 1,
    gap: 8,
  },
  bookingName: {
    width: '60%',
    height: 14,
  },
  bookingMeta: {
    width: '40%',
    height: 12,
  },
  bookingAction: {
    width: 72,
    height: 32,
    borderRadius: 10,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: 120,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  metricLabel: {
    width: '50%',
    height: 10,
  },
  metricValue: {
    width: '70%',
    height: 18,
  },
  floorGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    padding: 24,
    alignContent: 'flex-start',
  },
  floorTile: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  empAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  empBody: {
    flex: 1,
    gap: 6,
  },
  empName: {
    width: '70%',
    height: 12,
  },
  empMeta: {
    width: '40%',
    height: 10,
  },
});
