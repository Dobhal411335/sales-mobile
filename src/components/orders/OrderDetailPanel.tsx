import React from 'react';
import {Pressable, StyleSheet, Text, View, ScrollView} from 'react-native';
import {colors} from '../../constants/colors';
import type {TodayOrder, TodayOrderItem} from '../../types/todayOrder';
import {formatCurrency} from '../../utils/currency';
import {
  getOrderLocationLabel,
  getOrderPartyLabel,
  getOrderTypeBadgeVariant,
  getOrderTypeLabel,
  getPlacerName,
  shouldShowTable,
} from '../../utils/orderDisplay';
import {
  canPayTodayOrder,
  canWaiveOrder,
  getOrderGrandTotal,
  getOrderTypeBadgeColors,
  getPaymentStatusColors,
  getStatusColors,
} from '../../utils/todayOrderHelpers';

interface OrderDetailPanelProps {
  order: TodayOrder;
  onPayNow: () => void;
  onWaiveOff: () => void;
  onClose: () => void;
}

function filterItemOptions(item: TodayOrderItem) {
  return (item.options ?? []).filter((opt) => {
    const value = String(opt || '');
    if (value.toLowerCase().startsWith('style:')) {
      return false;
    }
    if (
      item.preparationStyle &&
      value.toLowerCase() === String(item.preparationStyle).toLowerCase()
    ) {
      return false;
    }
    return true;
  });
}

export function OrderDetailPanel({
  order,
  onPayNow,
  onWaiveOff,
  onClose,
}: OrderDetailPanelProps) {
  const placerName = getPlacerName(order);
  const orderStatusUpper = String(order.status || '').toUpperCase();
  const showPayNow = canPayTodayOrder(order);
  const showWaive = canWaiveOrder(order);
  const statusColors = getStatusColors(order.status);
  const typeVariant = getOrderTypeBadgeVariant(order);
  const typeColors = getOrderTypeBadgeColors(typeVariant);
  const paymentColors =
    orderStatusUpper === 'WAIVED'
      ? {bg: '#F1F5F9', text: '#334155', border: '#E2E8F0'}
      : getPaymentStatusColors(order.paymentStatus);

  const paymentStatusLabel =
    orderStatusUpper === 'WAIVED'
      ? 'WAIVED'
      : (order.paymentStatus || 'UNPAID').toUpperCase();

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.headerTop}>
            <Text style={styles.orderNumber}>ORDER #{order.orderNumber}</Text>
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
            <View style={[styles.statusBadge, {backgroundColor: statusColors.bg}]}>
              <Text style={[styles.statusText, {color: statusColors.text}]}>
                {order.status}
              </Text>
            </View>
          </View>
          <Text style={styles.context}>
            {getOrderLocationLabel(order)}
            {getOrderPartyLabel(order)
              ? ` · ${getOrderPartyLabel(order)}`
              : ''}
            {order.guestCount ? ` · ${order.guestCount} guests` : ''}
          </Text>
          {placerName ? (
            <Text style={styles.placer}>
              By {placerName}
              {order.processedByRole ? ` (${order.processedByRole})` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Order Information</Text>
        <View style={styles.infoBlock}>
          <InfoRow label="Order Type" value={getOrderTypeLabel(order)} badge />
          {shouldShowTable(order) ? (
            <InfoRow label="Table" value={order.tableNo ?? ''} bold />
          ) : null}
          {(order.partyName || order.guestName) && (
            <InfoRow
              label={order.source === 'STAFF' ? 'Staff Member' : 'Party'}
              value={order.partyName || order.guestName || ''}
              bold
            />
          )}
        </View>

        {order.source === 'STAFF' && order.staffOrderReason ? (
          <View style={styles.reasonBlock}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{order.staffOrderReason}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Payment</Text>
        <View
          style={[
            styles.paymentStatusCard,
            {
              backgroundColor: paymentColors.bg,
              borderColor: paymentColors.border,
            },
          ]}>
          <Text style={styles.paymentStatusLabel}>Status</Text>
          <Text
            style={[styles.paymentStatusValue, {color: paymentColors.text}]}>
            {paymentStatusLabel}
          </Text>
        </View>

        {orderStatusUpper === 'WAIVED' && order.waiveReason ? (
          <View style={styles.reasonBlock}>
            <Text style={styles.reasonLabel}>Waive Reason</Text>
            <Text style={styles.reasonText}>{order.waiveReason}</Text>
          </View>
        ) : null}

        {order.paymentMethod ? (
          <InfoRow label="Method" value={order.paymentMethod} />
        ) : null}
        <InfoRow
          label="Tip"
          value={formatCurrency(Number(order.tipAmount || 0))}
        />

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Order Items</Text>
        {(order.items ?? []).map((item, index) => (
          <View key={`${item.name}-${index}`} style={styles.itemRow}>
            <View style={styles.itemMain}>
              <Text style={styles.itemQty}>{item.qty}x</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.size && item.size !== 'Standard' ? (
                  <Text style={styles.itemMeta}>Variant: {item.size}</Text>
                ) : null}
                {item.preparationStyle ? (
                  <Text style={styles.itemMetaItalic}>{item.preparationStyle}</Text>
                ) : null}
                {filterItemOptions(item).map((opt, optIndex) => (
                  <Text key={optIndex} style={styles.itemMetaItalic}>
                    + {opt}
                  </Text>
                ))}
              </View>
            </View>
            <Text style={styles.itemPrice}>
              {formatCurrency(item.price * item.qty)}
            </Text>
          </View>
        ))}

        {order.specialNote ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Note</Text>
            <Text style={styles.noteText}>{order.specialNote}</Text>
          </>
        ) : null}

        <View style={styles.divider} />
        <View style={styles.totalsBlock}>
          <TotalRow label="Subtotal" value={formatCurrency(order.subTotal ?? 0)} />
          <TotalRow label="Tax" value={formatCurrency(order.taxTotal ?? 0)} />
          {Number(order.discountTotal || 0) > 0 ? (
            <TotalRow
              label={`Discount${order.discountCode ? ` (${order.discountCode})` : ''}`}
              value={`-${formatCurrency(Number(order.discountTotal))}`}
            />
          ) : null}
          {Number(order.giftcardUsedAmount || 0) > 0 ? (
            <TotalRow
              label="Gift Card"
              value={`-${formatCurrency(Number(order.giftcardUsedAmount))}`}
            />
          ) : null}
          <TotalRow
            label="Tip"
            value={formatCurrency(Number(order.tipAmount || 0))}
          />
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(getOrderGrandTotal(order))}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        {showPayNow ? (
          <Pressable
            style={({pressed}) => [
              styles.payButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onPayNow}
            accessibilityRole="button"
            accessibilityLabel="Pay Now">
            <Text style={styles.payButtonText}>Pay Now</Text>
          </Pressable>
        ) : null}
        {showWaive ? (
          <Pressable
            style={({pressed}) => [
              styles.waiveButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onWaiveOff}
            accessibilityRole="button"
            accessibilityLabel="Waive Off">
            <Text style={styles.waiveButtonText}>Waive Off</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={({pressed}) => [
            styles.closeButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close">
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  bold,
  badge,
}: {
  label: string;
  value: string;
  bold?: boolean;
  badge?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {badge ? (
        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>{value.toUpperCase()}</Text>
        </View>
      ) : (
        <Text style={[styles.infoValue, bold && styles.infoValueBold]}>
          {value}
        </Text>
      )}
    </View>
  );
}

function TotalRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cream,
  },
  headerText: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 18,
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
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  context: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  placer: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  infoBlock: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  infoValueBold: {
    fontWeight: '800',
  },
  infoBadge: {
    backgroundColor: colors.cream,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.4,
  },
  reasonBlock: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    padding: 12,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#312E81',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  paymentStatusCard: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentStatusLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  paymentStatusValue: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  itemMain: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  itemQty: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  itemMetaItalic: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
    color: colors.text,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  noteText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  totalsBlock: {
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  actions: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
    backgroundColor: colors.surface,
  },
  payButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
  waiveButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waiveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
  closeButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
  buttonPressed: {
    opacity: 0.9,
  },
});
