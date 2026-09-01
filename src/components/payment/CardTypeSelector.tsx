import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {CardTypeName} from '../../types/payment';

const CARD_TYPES: CardTypeName[] = [
  'Visa',
  'Mastercard',
  'RuPay',
  'Amex',
  'Discover',
];

interface CardTypeSelectorProps {
  selected: CardTypeName | '';
  onSelect: (type: CardTypeName) => void;
}

export function CardTypeSelector({
  selected,
  onSelect,
}: CardTypeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CARD TYPE</Text>
      <View style={styles.grid}>
        {CARD_TYPES.map((type) => {
          const isSelected = selected === type;
          return (
            <Pressable
              key={type}
              style={({pressed}) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
              onPress={() => onSelect(type)}
              accessibilityRole="button"
              accessibilityState={{selected: isSelected}}
              accessibilityLabel={type}>
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}>
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 48,
    minWidth: 100,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.cream,
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.text,
  },
});
