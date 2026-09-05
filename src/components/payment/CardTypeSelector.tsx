import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {CardTypeName} from '../../types/payment';

const CARD_TYPES: {
  name: CardTypeName;
  image: ImageSourcePropType;
}[] = [
  {name: 'Visa', image: require('../../assets/card/visa.png')},
  {name: 'Mastercard', image: require('../../assets/card/mastercard.webp')},
  {name: 'RuPay', image: require('../../assets/card/rupay.webp')},
  {name: 'Amex', image: require('../../assets/card/american-express.webp')},
  {name: 'Discover', image: require('../../assets/card/discover.png')},
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
      <Text style={styles.title}>SELECT CARD TYPE</Text>
      <View style={styles.grid}>
        {CARD_TYPES.map((card) => {
          const isSelected = selected === card.name;
          return (
            <Pressable
              key={card.name}
              style={({pressed}) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
              onPress={() => onSelect(card.name)}
              accessibilityRole="button"
              accessibilityState={{selected: isSelected}}
              accessibilityLabel={card.name}>
              <Image
                source={card.image}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}>
                {card.name}
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
    width: '23.5%',
    minHeight: 64,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  chipPressed: {
    opacity: 0.9,
  },
  logo: {
    width: 40,
    height: 24,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chipTextSelected: {
    color: colors.text,
  },
});
