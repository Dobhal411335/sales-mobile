import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Banknote, CreditCard, Gift} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {PaymentMethodKey} from '../../types/payment';

interface PaymentMethodSelectorProps {
  selected: PaymentMethodKey;
  onSelect: (method: PaymentMethodKey) => void;
}

const METHODS: Array<{
  key: PaymentMethodKey;
  label: string;
  Icon: typeof CreditCard;
}> = [
  {key: 'Card', label: 'CARD', Icon: CreditCard},
  {key: 'Cash', label: 'CASH', Icon: Banknote},
  {key: 'GiftCard', label: 'GIFT CARD', Icon: Gift},
];

export function PaymentMethodSelector({
  selected,
  onSelect,
}: PaymentMethodSelectorProps) {
  return (
    <View style={styles.row}>
      {METHODS.map((method) => {
        const isSelected = selected === method.key;
        const IconComponent = method.Icon;
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
            <IconComponent
              size={24}
              color={isSelected ? colors.primary : '#52525B'}
              strokeWidth={2}
            />
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
    minHeight: 74,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tileSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  tilePressed: {
    opacity: 0.92,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#52525B',
    letterSpacing: 0.5,
  },
  labelSelected: {
    color: colors.primary,
  },
});
