import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {CartTotals} from '../../types/cart';
import {formatCurrency} from '../../utils/currency';

interface CartSummaryProps {
  totals: CartTotals;
}

export function CartSummary({totals}: CartSummaryProps) {
  const taxable = Math.max(0, totals.subtotal - (totals.discountTotal || 0));
  const rate =
    taxable > 0 && totals.taxTotal > 0
      ? Math.round((totals.taxTotal / taxable) * 1000) / 10
      : null;
  const hstLabel = rate != null && rate > 0 ? `HST (${rate}%)` : 'HST';

  const discountRate =
    totals.subtotal > 0 && (totals.discountTotal || 0) > 0
      ? Math.round(((totals.discountTotal || 0) / totals.subtotal) * 1000) / 10
      : null;
  const discountLabel =
    discountRate != null && discountRate > 0
      ? `Discount (${discountRate}%)`
      : 'Discount';

  return (
    <View style={styles.summary}>
      <View style={styles.row}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value}>{formatCurrency(totals.subtotal)}</Text>
      </View>
      {(totals.discountTotal || 0) > 0 ? (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discountText]}>
            {discountLabel}
          </Text>
          <Text style={[styles.value, styles.discountText]}>
            -{formatCurrency(totals.discountTotal)}
          </Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.label}>{hstLabel}</Text>
        <Text style={styles.value}>{formatCurrency(totals.taxTotal)}</Text>
      </View>
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(totals.total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  discountText: {
    color: colors.success,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  totalRow: {
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
});
