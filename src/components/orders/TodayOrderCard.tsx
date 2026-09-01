import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {TodayOrder} from '../../types/todayOrder';
import {
  getOrderLocationLabel,
  getOrderPartyLabel,
  getOrderTypeBadgeVariant,
  getOrderTypeLabel,
  getPlacerName,
} from '../../utils/orderDisplay';
import {formatCurrency} from '../../utils/currency';
import {
  getOrderGrandTotal,
  getPaymentBadgeColors,
  getPaymentType,
  getStatusColors,
} from '../../utils/todayOrderHelpers';
import {getOrderTypeBadgeColors} from '../../utils/todayOrderHelpers';

interface TodayOrderCardProps {
  order: TodayOrder;
  selected: boolean;
  onPress: () => void;
}

function formatTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TodayOrderCard({order, selected, onPress}: TodayOrderCardProps) {
  const placerName = getPlacerName(order);
  const tip = Number(order.tipAmount || 0);
  const paymentType = getPaymentType(order);
  const paymentColors = getPaymentBadgeColors(paymentType.variant);
  const statusColors = getStatusColors(order.status);
  const typeVariant = getOrderTypeBadgeVariant(order);
  const typeColors = getOrderTypeBadgeColors(typeVariant);
  const locationLabel = getOrderLocationLabel(order);
  const partyLabel = getOrderPartyLabel(order);
  const guestCount = order.guestCount;

  return (
    <Pressable
      style={({pressed}) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{selected}}
      accessibilityLabel={`Order ${order.orderNumber}`}>
      <View style={styles.main}>
        <View style={styles.headerRow}>
          <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: typeColors.bg,
                borderColor: typeColors.border,
              },
            ]}>
            <Text style={[styles.typeBadgeText, {color: typeColors.text}]}>
              {getOrderTypeLabel(order).toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.location}>{locationLabel}</Text>

        {(partyLabel || guestCount) && (
          <Text style={styles.party}>
            {[partyLabel, guestCount ? `${guestCount} guests` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatTime(order.createdAt)}</Text>
          {placerName ? <Text style={styles.meta}>· {placerName}</Text> : null}
          <Text style={styles.meta}>
            · {order.items?.length || 0}{' '}
            {(order.items?.length || 0) === 1 ? 'item' : 'items'}
          </Text>
          {tip > 0 ? (
            <Text style={styles.tipMeta}>· Tip {formatCurrency(tip)}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.trailing}>
        <Text style={styles.total}>
          {formatCurrency(getOrderGrandTotal(order))}
        </Text>
        <View
          style={[
            styles.paymentBadge,
            {
              backgroundColor: paymentColors.bg,
              borderColor: paymentColors.border,
            },
          ]}>
          <Text style={[styles.paymentText, {color: paymentColors.text}]}>
            {paymentType.label.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: statusColors.bg}]}>
          <Text style={[styles.statusText, {color: statusColors.text}]}>
            {order.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 88,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  cardPressed: {
    opacity: 0.92,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  typeBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  location: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  party: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  meta: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tipMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 100,
  },
  total: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  paymentBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
