import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem} from '../../types/cart';
import {formatCurrency} from '../../utils/currency';
import {roundMoney} from '../../utils/receiptFormat';

interface PaymentSummaryProps {
  orderNumber?: string | null;
  tableNumber?: string;
  floorName?: string;
  guestCount?: number;
  partyName?: string;
  items: CartLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  serviceChargeTotal?: number;
  serviceChargeName?: string;
  giftCardUsed?: number;
  totalDue: number;
  tipAmount?: number;
}

export function PaymentSummary({
  orderNumber,
  tableNumber,
  floorName,
  guestCount,
  partyName,
  items,
  subtotal,
  taxTotal,
  discountTotal,
  serviceChargeTotal = 0,
  serviceChargeName,
  giftCardUsed = 0,
  totalDue,
  tipAmount = 0,
}: PaymentSummaryProps) {
  const tableLabel =
    tableNumber && floorName
      ? `Table ${tableNumber} · ${floorName}`
      : tableNumber
        ? `Table ${tableNumber}`
        : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>

      {orderNumber ? (
        <Text style={styles.meta}>Order #{orderNumber}</Text>
      ) : null}
      {tableLabel ? <Text style={styles.meta}>{tableLabel}</Text> : null}
      {guestCount != null ? (
        <Text style={styles.meta}>{guestCount} guests</Text>
      ) : null}
      {partyName ? (
        <Text style={styles.meta}>Party: {partyName}</Text>
      ) : null}

      <View style={styles.itemsBlock}>
        {items.map((item) => (
          <View key={item.cartId} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.qty}× {item.name}
            </Text>
            <Text style={styles.itemPrice}>
              {formatCurrency(roundMoney(item.price * item.qty))}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
        </View>
        {discountTotal > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount</Text>
            <Text style={styles.totalValue}>
              -{formatCurrency(discountTotal)}
            </Text>
          </View>
        ) : null}
        {serviceChargeTotal > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {serviceChargeName || 'Service Charge'}
            </Text>
            <Text style={styles.totalValue}>
              {formatCurrency(serviceChargeTotal)}
            </Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>HST</Text>
          <Text style={styles.totalValue}>{formatCurrency(taxTotal)}</Text>
        </View>
        {giftCardUsed > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gift Card</Text>
            <Text style={styles.totalValue}>
              -{formatCurrency(giftCardUsed)}
            </Text>
          </View>
        ) : null}
        {tipAmount > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tip</Text>
            <Text style={styles.totalValue}>{formatCurrency(tipAmount)}</Text>
          </View>
        ) : null}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalDueLabel}>TOTAL DUE</Text>
          <Text style={styles.totalDueValue}>
            {formatCurrency(totalDue + tipAmount)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  meta: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  itemsBlock: {
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  totals: {
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginVertical: 8,
  },
  totalDueLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  totalDueValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
});
