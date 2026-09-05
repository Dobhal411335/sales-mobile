import React, {useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem, CartTotals} from '../../types/cart';
import {ConfirmDialog} from '../common/ConfirmDialog';
import {ShoppingCart} from 'lucide-react-native';
import {CartItem} from './CartItem';
import {CartSummary} from './CartSummary';

interface CartProps {
  items: CartLineItem[];
  orderNote: string;
  orderNumber: string | null;
  totals: CartTotals;
  canSendKot: boolean;
  canPay: boolean;
  hasSentKot: boolean;
  onChangeNote: (note: string) => void;
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onRemove: (cartId: string) => void;
  onClearAll: () => void;
  onSendKot: () => void;
  onPayNow: () => void;
}

export function Cart({
  items,
  orderNote,
  orderNumber,
  totals,
  canSendKot,
  canPay,
  hasSentKot,
  onChangeNote,
  onIncrease,
  onDecrease,
  onRemove,
  onClearAll,
  onSendKot,
  onPayNow,
}: CartProps) {
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

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

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No items added</Text>
          <Text style={styles.emptyText}>Tap a menu item to begin order.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.cartId}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({item}) => (
            <CartItem
              item={item}
              onIncrease={() => onIncrease(item.cartId)}
              onDecrease={() => onDecrease(item.cartId)}
              onRemove={() => onRemove(item.cartId)}
            />
          )}
        />
      )}

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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    backgroundColor: colors.primary,
  },
  payButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  payButtonText: {
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
