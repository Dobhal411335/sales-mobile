import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Percent,
  User,
} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem} from '../../types/cart';
import type {
  AppliedPaymentDiscount,
  DiscountCoupon,
  ServiceTaxConfig,
} from '../../types/payment';
import {formatCurrency} from '../../utils/currency';
import {roundMoney} from '../../utils/receiptFormat';
import {formatServiceTaxRate} from '../../utils/serviceCharge';

interface PaymentSummaryProps {
  orderNumber?: string | null;
  tableNumber?: string;
  floorName?: string;
  guestCount?: number;
  partyName?: string;
  onChangePartyName?: (name: string) => void;
  items?: CartLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  discountLabel?: string;
  serviceChargeTotal?: number;
  serviceChargeName?: string;
  includeServiceCharge?: boolean;
  onToggleServiceCharge?: () => void;
  serviceTax?: ServiceTaxConfig | null;
  giftCardUsed?: number;
  totalDue: number;
  tipAmount?: number;
  lockedCardAmount?: number;
  lockedCashAmount?: number;
  selectedCardType?: string;

  // Discount section
  availableDiscounts?: DiscountCoupon[];
  appliedDiscount?: AppliedPaymentDiscount | null;
  discountCode?: string;
  onChangeDiscountCode?: (code: string) => void;
  onApplyDiscount?: (code?: string) => void;
  onRemoveDiscount?: () => void;
  onOpenDiscountSelector?: () => void;
  isStaffOrder?: boolean;
}

export function PaymentSummary({
  orderNumber,
  tableNumber,
  floorName,
  guestCount,
  partyName = '',
  onChangePartyName,
  items = [],
  subtotal,
  taxTotal,
  discountTotal,
  discountLabel,
  serviceChargeTotal = 0,
  serviceChargeName,
  includeServiceCharge = false,
  onToggleServiceCharge,
  serviceTax,
  giftCardUsed = 0,
  totalDue,
  tipAmount = 0,
  lockedCardAmount = 0,
  lockedCashAmount = 0,
  selectedCardType,
  availableDiscounts = [],
  appliedDiscount = null,
  discountCode = '',
  onChangeDiscountCode,
  onApplyDiscount,
  onRemoveDiscount,
  onOpenDiscountSelector,
  isStaffOrder = false,
}: PaymentSummaryProps) {
  const [itemsExpanded, setItemsExpanded] = useState(false);

  const taxableBase = Math.max(0, subtotal - (discountTotal || 0));
  const hstRate =
    taxableBase > 0 && taxTotal > 0
      ? Math.round((taxTotal / taxableBase) * 1000) / 10
      : null;
  const hstLabel = hstRate != null && hstRate > 0 ? `HST (${hstRate}%)` : 'HST';

  const computedDiscountRate =
    subtotal > 0 && (discountTotal || 0) > 0
      ? Math.round(((discountTotal || 0) / subtotal) * 1000) / 10
      : null;

  const resolvedDiscountLabel =
    discountLabel ||
    (computedDiscountRate != null && computedDiscountRate > 0
      ? `Discount (${computedDiscountRate}%)`
      : 'Discount');

  const tableLabel =
    tableNumber && floorName
      ? `${tableNumber} · ${floorName}`
      : tableNumber
        ? `${tableNumber}`
        : null;

  const totalItemCount = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {/* 1. ORDER SUMMARY PILLS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
        <View style={styles.pillsRow}>
          {orderNumber ? (
            <View style={styles.pillBadge}>
              <Text style={styles.pillText}>Order #{orderNumber}</Text>
            </View>
          ) : null}
          {tableLabel ? (
            <View style={styles.pillBadge}>
              <Text style={styles.pillText}>{tableLabel}</Text>
            </View>
          ) : null}
          {guestCount != null ? (
            <View style={styles.pillBadge}>
              <Text style={styles.pillText}>
                {guestCount} guest{guestCount === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 2. PARTY / CUSTOMER NAME CONTAINER */}
      <View style={styles.section}>
        <View style={styles.partyLabelRow}>
          <User size={13} color="#71717A" strokeWidth={2.2} />
          <Text style={styles.partyLabel}>
            PARTY / CUSTOMER NAME{' '}
            <Text style={styles.optionalText}>(optional)</Text>
          </Text>
        </View>
        <TextInput
          style={styles.partyInput}
          value={partyName}
          onChangeText={onChangePartyName}
          placeholder="e.g. John Doe"
          placeholderTextColor="#A1A1AA"
          accessibilityLabel="Party or customer name"
        />
      </View>

      {/* 3. OPTIONAL SERVICE CHARGE TOGGLE */}
      {serviceTax && onToggleServiceCharge ? (
        <Pressable
          style={styles.serviceChargeCard}
          onPress={onToggleServiceCharge}
          accessibilityRole="checkbox"
          accessibilityState={{checked: includeServiceCharge}}>
          <View
            style={[
              styles.checkbox,
              includeServiceCharge && styles.checkboxChecked,
            ]}>
            {includeServiceCharge ? (
              <Text style={styles.checkboxMark}>✓</Text>
            ) : null}
          </View>
          <View style={styles.serviceChargeInfo}>
            <Text style={styles.serviceChargeTitle}>
              Add {serviceTax.name || 'Server Charge'}
            </Text>
            <Text style={styles.serviceChargeSub}>
              {formatServiceTaxRate(serviceTax)}
              {serviceChargeTotal > 0
                ? ` · ${formatCurrency(serviceChargeTotal)}`
                : ''}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {/* 4. TOTALS CARD CONTAINER */}
      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{hstLabel}</Text>
          <Text style={styles.totalValue}>{formatCurrency(taxTotal)}</Text>
        </View>

        {serviceChargeTotal > 0 ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {serviceChargeName || 'Server Charge'}
            </Text>
            <Text style={styles.totalValue}>
              {formatCurrency(serviceChargeTotal)}
            </Text>
          </View>
        ) : null}

        {discountTotal > 0 ? (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.discountText]}>
              {resolvedDiscountLabel}
            </Text>
            <Text style={[styles.totalValue, styles.discountText]}>
              -{formatCurrency(discountTotal)}
            </Text>
          </View>
        ) : null}

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

        <View style={styles.totalsDivider} />

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>TOTAL DUE</Text>
          <Text style={styles.grandTotalValue}>
            {formatCurrency(totalDue + tipAmount)}
          </Text>
        </View>
      </View>

      {/* 5. APPLY DISCOUNT CONTAINER (Last Section) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isStaffOrder ? 'STAFF DISCOUNT' : 'APPLY DISCOUNT'}
        </Text>

        {appliedDiscount ? (
          <View style={styles.appliedDiscountCard}>
            <View style={styles.appliedDiscountLeft}>
              <CheckCircle2 size={18} color="#16A34A" />
              <View style={styles.appliedDiscountTextCol}>
                <Text style={styles.appliedDiscountCode}>
                  {appliedDiscount.code}
                </Text>
                <Text style={styles.appliedDiscountSavings}>
                  {appliedDiscount.type === 'percent'
                    ? `${appliedDiscount.value}% off · -${formatCurrency(discountTotal)}`
                    : `-${formatCurrency(discountTotal)}`}
                </Text>
              </View>
            </View>
            {onRemoveDiscount ? (
              <Pressable
                style={styles.removeDiscountBtn}
                onPress={onRemoveDiscount}
                accessibilityRole="button"
                accessibilityLabel="Remove applied discount">
                <Text style={styles.removeDiscountBtnText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.discountControls}>
            {onOpenDiscountSelector ? (
              <Pressable
                style={styles.selectDiscountTrigger}
                onPress={onOpenDiscountSelector}
                accessibilityRole="button"
                accessibilityLabel="Select a discount">
                <Text style={styles.selectDiscountTriggerText}>
                  {availableDiscounts && availableDiscounts.length > 0
                    ? 'Select a discount...'
                    : 'No active discounts'}
                </Text>
                <ChevronDown size={18} color="#71717A" />
              </Pressable>
            ) : null}

            <View style={styles.discountInputRow}>
              <View style={styles.discountInputWrap}>
                <Percent size={14} color="#A1A1AA" />
                <TextInput
                  style={styles.discountInput}
                  value={discountCode}
                  onChangeText={onChangeDiscountCode}
                  placeholder="% OR ENTER DISCOUNT CODE..."
                  placeholderTextColor="#A1A1AA"
                  autoCapitalize="characters"
                  accessibilityLabel="Discount code"
                />
              </View>
              {onApplyDiscount ? (
                <Pressable
                  style={[
                    styles.discountApplyBtn,
                    !discountCode?.trim() && styles.discountApplyBtnDisabled,
                  ]}
                  onPress={() => onApplyDiscount()}
                  disabled={!discountCode?.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Apply discount">
                  <Text style={styles.discountApplyBtnText}>Apply</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* 6. PAYMENT SPLIT BREAKDOWN (if active) */}
      {lockedCardAmount > 0 || lockedCashAmount > 0 ? (
        <View style={styles.splitCard}>
          <Text style={styles.splitHeading}>PAYMENT SPLIT</Text>
          {lockedCardAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Card {selectedCardType ? `(${selectedCardType})` : ''}
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(lockedCardAmount)}
              </Text>
            </View>
          ) : null}
          {lockedCashAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Cash</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(lockedCashAmount)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 7. ORDER ITEMS (Collapsible) */}
      {items.length > 0 ? (
        <View style={styles.itemsSection}>
          <Pressable
            style={styles.itemsHeader}
            onPress={() => setItemsExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Toggle order items">
            <Text style={styles.itemsHeaderTitle}>
              ORDER ITEMS ({totalItemCount})
            </Text>
            {itemsExpanded ? (
              <ChevronUp size={16} color="#71717A" />
            ) : (
              <ChevronDown size={16} color="#71717A" />
            )}
          </Pressable>

          {itemsExpanded ? (
            <View style={styles.itemsList}>
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
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pillBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181B',
  },
  partyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  partyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionalText: {
    color: '#A1A1AA',
    fontWeight: '600',
    textTransform: 'none',
  },
  partyInput: {
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#18181B',
  },
  serviceChargeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    padding: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#A1A1AA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxMark: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  serviceChargeInfo: {
    flex: 1,
    gap: 2,
  },
  serviceChargeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
  },
  serviceChargeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717A',
  },
  totalsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
  },
  discountText: {
    color: '#16A34A',
    fontWeight: '700',
  },
  totalsDivider: {
    height: 1,
    backgroundColor: '#E4E4E7',
    marginVertical: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#18181B',
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#18181B',
    lineHeight: 30,
  },
  discountControls: {
    gap: 8,
  },
  selectDiscountTrigger: {
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectDiscountTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#52525B',
  },
  discountInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  discountInputWrap: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  discountInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#18181B',
    letterSpacing: 0.4,
  },
  discountApplyBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountApplyBtnDisabled: {
    opacity: 0.5,
  },
  discountApplyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appliedDiscountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 8,
  },
  appliedDiscountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  appliedDiscountTextCol: {
    gap: 2,
    flex: 1,
  },
  appliedDiscountCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  appliedDiscountSavings: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  removeDiscountBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  removeDiscountBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  splitCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  splitHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemsSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  itemsHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.5,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
    padding: 12,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#18181B',
    paddingRight: 8,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
  },
});
