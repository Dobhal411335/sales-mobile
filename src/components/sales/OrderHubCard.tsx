import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {TodayOrder} from '../../types/todayOrder';
import {formatCurrency} from '../../utils/currency';
import {getDirectSalePartyLabel, getOrderPartyLabel} from '../../utils/orderDisplay';
import {
  getOrderGrandTotal,
  getOrderItemCount,
  getStatusColors,
  isOrderOpen,
  isOrderPaid,
} from '../../utils/todayOrderHelpers';

interface OrderHubCardProps {
  order: TodayOrder;
  typeLabel: string;
  onContinue?: () => void;
  onPay?: () => void;
}

function formatTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function OrderHubCard({
  order,
  typeLabel,
  onContinue,
  onPay,
}: OrderHubCardProps) {
  const open = isOrderOpen(order);
  const paid = isOrderPaid(order);
  const party =
    order.source === 'STAFF'
      ? getDirectSalePartyLabel(order)
      : getOrderPartyLabel(order) || typeLabel;
  const total = getOrderGrandTotal(order);
  const items = getOrderItemCount(order);
  const statusLabel = paid
    ? 'PAID'
    : String(order.status || 'PENDING').toUpperCase();
  const statusColors = getStatusColors(
    paid ? 'PAID' : (order.status as TodayOrder['status']),
  );

  return (
    <View
      style={[
        styles.card,
        open && styles.cardOpen,
        paid && styles.cardPaid,
      ]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeRow}>
            <Text style={styles.orderNumber}>
              #{order.orderNumber || '—'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: statusColors.bg},
              ]}>
              <Text style={[styles.statusText, {color: statusColors.text}]}>
                {statusLabel}
              </Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{typeLabel}</Text>
            </View>
          </View>
          <Text style={styles.party} numberOfLines={1}>
            {party}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.total}>{formatCurrency(total)}</Text>
          <Text style={styles.time}>{formatTime(order.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {items} item{items === 1 ? '' : 's'}
        {order.processedByName ? ` · ${order.processedByName}` : ''}
      </Text>

      {open ? (
        <View style={styles.actions}>
          <Pressable
            style={({pressed}) => [
              styles.continueBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue order">
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
          <Pressable
            style={({pressed}) => [
              styles.payBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={onPay}
            accessibilityRole="button"
            accessibilityLabel="Pay order">
            <Text style={styles.payText}>Pay</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  cardOpen: {
    borderColor: '#FCD34D',
  },
  cardPaid: {
    borderColor: '#A7F3D0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  typeBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.cream,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  party: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  total: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  continueBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 14,
  },
  payBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 14,
  },
  btnPressed: {
    opacity: 0.85,
  },
});
