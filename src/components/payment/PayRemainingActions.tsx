import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Banknote, CreditCard, Gift} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {PaymentMethodKey} from '../../types/payment';
import {formatCurrency} from '../../utils/currency';

interface PayRemainingActionsProps {
  remaining: number;
  currentMethod: PaymentMethodKey;
  onSwitch: (method: PaymentMethodKey) => void;
}

export function PayRemainingActions({
  remaining,
  currentMethod,
  onSwitch,
}: PayRemainingActionsProps) {
  if (remaining <= 0) {
    return null;
  }

  const allOptions: Array<{
    key: PaymentMethodKey;
    label: string;
    icon: typeof CreditCard;
  }> = [
    {key: 'Card', label: 'Rest with Card', icon: CreditCard},
    {key: 'Cash', label: 'Rest with Cash', icon: Banknote},
    {key: 'GiftCard', label: 'Rest with Gift Card', icon: Gift},
  ];

  const options = allOptions.filter((opt) => opt.key !== currentMethod);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>REMAINING DUE</Text>
        <Text style={styles.amount}>{formatCurrency(remaining)}</Text>
      </View>
      <Text style={styles.subtitle}>Choose how to pay the rest:</Text>
      <View style={styles.optionsRow}>
        {options.map(({key, label, icon: Icon}) => (
          <Pressable
            key={key}
            style={styles.actionButton}
            onPress={() => onSwitch(key)}
            accessibilityRole="button"
            accessibilityLabel={label}>
            <Icon size={18} color={colors.primary} />
            <Text style={styles.actionText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2D12',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    minWidth: 130,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
