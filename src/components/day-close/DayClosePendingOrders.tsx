import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {DayClosePendingOrder} from '../../types/dayClose';

interface DayClosePendingOrdersProps {
  orders: DayClosePendingOrder[];
  totalCount: number;
  onOrderPress?: (order: DayClosePendingOrder) => void;
  onGoToOrders?: () => void;
}

function formatOrderContext(order: DayClosePendingOrder): string {
  const parts: string[] = [];
  if (order.tableNo) {
    parts.push(order.tableNo);
  }
  if (order.partyName) {
    parts.push(order.partyName);
  }
  return parts.join(' · ');
}

export function DayClosePendingOrders({
  orders,
  totalCount,
  onOrderPress,
  onGoToOrders,
}: DayClosePendingOrdersProps) {
  const hiddenCount = Math.max(0, totalCount - orders.length);

  return (
    <View style={styles.container}>
      {orders.map((order) => {
        const context = formatOrderContext(order);
        return (
          <Pressable
            key={order.id}
            style={({pressed}) => [
              styles.row,
              pressed && styles.rowPressed,
            ]}
            onPress={() => onOrderPress?.(order)}
            accessibilityRole="button"
            accessibilityLabel={`Order ${order.orderNumber}`}>
            <View style={styles.rowMain}>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              {context ? (
                <Text style={styles.context} numberOfLines={2}>
                  {context}
                </Text>
              ) : null}
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </Pressable>
        );
      })}

      {hiddenCount > 0 ? (
        <Text style={styles.moreText}>
          +{hiddenCount} more on the Orders screen
        </Text>
      ) : null}

      {onGoToOrders ? (
        <Pressable
          style={({pressed}) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onGoToOrders}
          accessibilityRole="button"
          accessibilityLabel="Go to Orders">
          <Text style={styles.actionButtonText}>Go to Orders</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    backgroundColor: colors.cream,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  context: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },
  moreText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionButtonPressed: {
    backgroundColor: colors.cream,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
