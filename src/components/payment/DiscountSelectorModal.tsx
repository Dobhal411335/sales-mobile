import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {TabletModal} from '../common/TabletModal';
import {colors} from '../../constants/colors';
import type {DiscountCoupon} from '../../types/payment';
import {formatCurrency} from '../../utils/currency';

interface DiscountSelectorModalProps {
  visible: boolean;
  discounts: DiscountCoupon[];
  onClose: () => void;
  onSelect: (code: string) => void;
}

export function DiscountSelectorModal({
  visible,
  discounts,
  onClose,
  onSelect,
}: DiscountSelectorModalProps) {
  return (
    <TabletModal
      visible={visible}
      title="Select Discount"
      onClose={onClose}
      maxWidth={440}
      footerActions={[
        {
          label: 'Cancel',
          variant: 'secondary',
          onPress: onClose,
        },
      ]}>
      <View style={styles.container}>
        {discounts.length === 0 ? (
          <Text style={styles.emptyText}>No active discounts available.</Text>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {discounts.map((discount) => {
              const valueLabel =
                discount.discountType === 'percent'
                  ? `${discount.value}% OFF`
                  : `${formatCurrency(discount.value)} OFF`;

              return (
                <Pressable
                  key={discount._id || discount.code}
                  style={styles.item}
                  onPress={() => {
                    onSelect(discount.code);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Apply discount ${discount.code}`}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.codeText}>{discount.code}</Text>
                    {discount.label ? (
                      <Text style={styles.labelText}>{discount.label}</Text>
                    ) : null}
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{valueLabel}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </TabletModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  list: {
    maxHeight: 360,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: 8,
  },
  itemLeft: {
    gap: 2,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  labelText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
});
