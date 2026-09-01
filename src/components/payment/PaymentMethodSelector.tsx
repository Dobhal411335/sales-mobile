import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {PaymentMethodKey} from '../../types/payment';

interface PaymentMethodSelectorProps {
  selected: PaymentMethodKey;
  onSelect: (method: PaymentMethodKey) => void;
}

const METHODS: Array<{
  key: PaymentMethodKey;
  label: string;
  icon: string;
}> = [
  {key: 'Card', label: 'Card', icon: '💳'},
  {key: 'Cash', label: 'Cash', icon: '💵'},
  {key: 'GiftCard', label: 'Gift Card', icon: '🎁'},
];

export function PaymentMethodSelector({
  selected,
  onSelect,
}: PaymentMethodSelectorProps) {
  return (
    <View style={styles.row}>
      {METHODS.map((method) => {
        const isSelected = selected === method.key;
        return (
          <Pressable
            key={method.key}
            style={({pressed}) => [
              styles.tile,
              isSelected && styles.tileSelected,
              pressed && styles.tilePressed,
            ]}
            onPress={() => onSelect(method.key)}
            accessibilityRole="button"
            accessibilityState={{selected: isSelected}}
            accessibilityLabel={method.label}>
            <Text style={styles.icon}>{method.icon}</Text>
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}>
              {method.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
  },
  tileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.cream,
  },
  tilePressed: {
    opacity: 0.92,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.text,
  },
});
