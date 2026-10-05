import React, {useMemo, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import {ChevronDown, ChevronUp, ShoppingCart} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem, CartTotals} from '../../types/cart';
import {ConfirmDialog} from '../common/ConfirmDialog';
import {CartItem} from './CartItem';
import {CartSummary} from './CartSummary';
import {
  formatSeatAccordionLabel,
  getSeatAccordionStyle,
  normalizeSeatNumber,
} from '../../utils/seatHelpers';

interface CartProps {
  items: CartLineItem[];
  orderNote: string;
  orderNumber: string | null;
  totals: CartTotals;
  canSendKot: boolean;
  canPay: boolean;
  hasSentKot: boolean;
  /** Manager / terminal roles — Staff see Go to Orders instead. */
  canCollectPayment?: boolean;
  showSeatTabs?: boolean;
  seatCount?: number;
  activeSeatNumber?: number | null;
  onSelectSeat?: (seat: number | null) => void;
  onChangeNote: (note: string) => void;
  onChangeItemNotes: (cartId: string, notes: string) => void;
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onRemove: (cartId: string) => void;
  onClearAll: () => void;
  onSendKot: () => void;
  onPayNow: () => void;
  onGoToOrders?: () => void;
}

type SeatSection = {
  seatNumber: number | null;
  label: string;
};

export function Cart({
  items,
  orderNote,
  orderNumber,
  totals,
  canSendKot,
  canPay,
  hasSentKot,
  canCollectPayment = true,
  showSeatTabs = false,
  seatCount = 0,
  activeSeatNumber = null,
  onSelectSeat,
  onChangeNote,
  onChangeItemNotes,
  onIncrease,
  onDecrease,
  onRemove,
  onClearAll,
  onSendKot,
  onPayNow,
  onGoToOrders,
}: CartProps) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  const seatSections = useMemo((): SeatSection[] => {
    if (!showSeatTabs || seatCount < 1) {
      return [];
    }
    return [
      {seatNumber: null, label: formatSeatAccordionLabel(null)},
      ...Array.from({length: seatCount}, (_, i) => ({
        seatNumber: i + 1,
        label: formatSeatAccordionLabel(i + 1),
      })),
    ];
  }, [showSeatTabs, seatCount]);

  const renderItemHandlers = (item: CartLineItem) => (
    <CartItem
      key={item.cartId}
      item={item}
      onIncrease={() => onIncrease(item.cartId)}
      onDecrease={() => onDecrease(item.cartId)}
      onRemove={() => onRemove(item.cartId)}
      onChangeNotes={(notes) => onChangeItemNotes(item.cartId, notes)}
    />
  );

  const renderSeatAccordions = () =>
    seatSections.map((section) => {
      const isOpen =
        normalizeSeatNumber(activeSeatNumber) ===
        normalizeSeatNumber(section.seatNumber);
      const style = getSeatAccordionStyle(section.seatNumber);
      const sectionItems = items.filter(
        (i) =>
          normalizeSeatNumber(i.seatNumber) ===
          normalizeSeatNumber(section.seatNumber),
      );
      const sectionQty = sectionItems.reduce(
        (s, i) => s + (Number(i.qty) || 0),
        0,
      );
      const emptyLabel =
        section.seatNumber == null
          ? 'Table'
          : `Seat ${section.seatNumber}`;

      return (
        <View key={section.label} style={styles.accordionWrap}>
          <Pressable
            onPress={() =>
              onSelectSeat?.(normalizeSeatNumber(section.seatNumber))
            }
            style={[
              styles.accordionHeader,
              {backgroundColor: style.headerBg},
            ]}
            accessibilityRole="button"
            accessibilityState={{expanded: isOpen}}>
            <Text style={[styles.accordionTitle, {color: style.headerText}]}>
              {section.label}
            </Text>
            <View style={styles.accordionHeaderRight}>
              {sectionQty > 0 ? (
                <View
                  style={[
                    styles.accordionBadge,
                    {backgroundColor: style.badgeBg},
                  ]}>
                  <Text
                    style={[
                      styles.accordionBadgeText,
                      {color: style.badgeText},
                    ]}>
                    {sectionQty}
                  </Text>
                </View>
              ) : null}
              {isOpen ? (
                <ChevronUp size={20} color={style.headerText} />
              ) : (
                <ChevronDown size={20} color={style.headerText} />
              )}
            </View>
          </Pressable>
          {isOpen ? (
            <View style={styles.accordionBody}>
              {sectionItems.length === 0 ? (
                <View style={styles.accordionEmpty}>
                  <Text style={styles.emptyTitle}>No items added</Text>
                  <Text style={styles.emptyText}>
                    Tap a menu item to add to {emptyLabel}.
                  </Text>
                </View>
              ) : (
                sectionItems.map((item) => renderItemHandlers(item))
              )}
            </View>
          ) : null}
        </View>
      );
    });

  return (
    <View style={styles.cart}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.cartIconWrap}>
            <ShoppingCart size={18} color={colors.text} />
            {itemCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            ) : null}
          </View>
          <View>
            <Text style={styles.title}>
              {orderNumber ? `Order #${orderNumber}` : 'ORDER'}
            </Text>
          </View>
        </View>
        {items.length > 0 ? (
          <Pressable
            onPress={() => setConfirmClearOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Clear all items">
            <Text style={styles.clearAll}>Clear All</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>
        {showSeatTabs && seatCount > 0 ? (
          renderSeatAccordions()
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No items added</Text>
            <Text style={styles.emptyText}>
              Tap a menu item to begin order.
            </Text>
          </View>
        ) : (
          items.map((item) => renderItemHandlers(item))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.notesLabel}>Order Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={orderNote}
          onChangeText={onChangeNote}
          placeholder="e.g. Nut allergy..."
          placeholderTextColor={colors.textSecondary}
          multiline
          accessibilityLabel="Order notes"
        />

        <CartSummary totals={totals} />

        <View style={styles.actions}>
          <Pressable
            style={({pressed}) => [
              styles.kotButton,
              (!canSendKot || hasSentKot) && styles.actionDisabled,
              pressed && canSendKot && !hasSentKot && styles.kotButtonPressed,
            ]}
            disabled={!canSendKot || hasSentKot}
            onPress={onSendKot}
            accessibilityRole="button"
            accessibilityLabel="Send to kitchen">
            <Text
              style={[
                styles.kotButtonText,
                (!canSendKot || hasSentKot) && styles.actionTextDisabled,
              ]}>
              {hasSentKot ? 'KOT Sent' : 'Kitchen / KOT'}
            </Text>
          </Pressable>

          {canCollectPayment ? (
            <Pressable
              style={({pressed}) => [
                styles.payButton,
                !canPay && styles.actionDisabled,
                pressed && canPay && styles.payButtonPressed,
              ]}
              disabled={!canPay}
              onPress={onPayNow}
              accessibilityRole="button"
              accessibilityLabel="Pay now">
              <Text
                style={[
                  styles.payButtonText,
                  !canPay && styles.actionTextDisabled,
                ]}>
                Pay Now
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={({pressed}) => [
                styles.ordersButton,
                pressed && styles.ordersButtonPressed,
              ]}
              onPress={onGoToOrders}
              accessibilityRole="button"
              accessibilityLabel="Go to Orders">
              <Text style={styles.ordersButtonText}>Go to Orders</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ConfirmDialog
        visible={confirmClearOpen}
        title="Clear Order?"
        message="Remove all items from this order?"
        confirmLabel="Clear All"
        destructive
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          setConfirmClearOpen(false);
          onClearAll();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cart: {
    flex: 1,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  cartIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  clearAll: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  accordionWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  accordionBody: {
    backgroundColor: '#FAFAFA',
    padding: 10,
    gap: 8,
  },
  accordionEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  notesInput: {
    minHeight: 44,
    maxHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.cream,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  kotButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  kotButtonPressed: {
    backgroundColor: colors.primaryLight,
  },
  kotButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryHover,
  },
  payButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
  },
  payButtonPressed: {
    backgroundColor: '#B91C1C',
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
  ordersButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  ordersButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  ordersButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionTextDisabled: {
    opacity: 0.8,
  },
});
