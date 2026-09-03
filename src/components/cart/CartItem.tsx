import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {CartLineItem} from '../../types/cart';
import {formatCurrency} from '../../utils/currency';

interface CartItemProps {
  item: CartLineItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

function CartItemComponent({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: CartItemProps) {
  const lineTotal = item.price * item.qty;

  return (
    <View style={styles.item}>
      <View style={styles.topRow}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            {item.isOffer ? (
              <Text style={styles.offerBadge}>OFFER</Text>
            ) : null}
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          {item.modifier ? (
            <Text style={styles.modifier} numberOfLines={3}>
              {item.modifier}
            </Text>
          ) : null}
        </View>
        <Text style={styles.price}>{formatCurrency(lineTotal)}</Text>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.qtyControls}>
          <Pressable
            style={styles.qtyButton}
            onPress={onDecrease}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${item.name}`}>
            <Text style={styles.qtyButtonText}>−</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{item.qty}</Text>
          <Pressable
            style={styles.qtyButton}
            onPress={onIncrease}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${item.name}`}>
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name}`}>
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const CartItem = memo(CartItemComponent);

const styles = StyleSheet.create({
  item: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  offerBadge: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  modifier: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  qtyButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
});
