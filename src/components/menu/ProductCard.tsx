import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {MenuProduct} from '../../types/product';
import {productNeedsOptions} from '../../types/product';
import {formatCurrency} from '../../utils/currency';
import {cleanOfferList, offerNeedsOptions} from '../../utils/offerDetails';

interface ProductCardProps {
  product: MenuProduct;
  onPress: (product: MenuProduct) => void;
}

function getOfferOptionPreview(product: MenuProduct): string {
  const parts = [
    ...cleanOfferList(product.inclusions),
    ...cleanOfferList(product.choices),
    ...cleanOfferList(product.drinks),
  ];
  return parts.join(' · ');
}

function ProductCardComponent({product, onPress}: ProductCardProps) {
  const isOffer = Boolean(product.isOffer);
  const hasOptions = isOffer
    ? offerNeedsOptions(product)
    : productNeedsOptions(product);
  const offerOptionsPreview = isOffer ? getOfferOptionPreview(product) : '';
  const basePrice =
    product.variants && product.variants.length > 0
      ? product.variants[0].price
      : product.price;

  return (
    <Pressable
      style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatCurrency(basePrice)}`}>
      <View style={styles.headerRow}>
        {product.productCode ? (
          <Text style={styles.code}>{product.productCode}</Text>
        ) : isOffer ? (
          <Text style={styles.offerTag}>Offer</Text>
        ) : (
          <View />
        )}
        {hasOptions ? (
          <View style={styles.optionsBadge}>
            <Text style={styles.optionsBadgeText}>Options</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.category} numberOfLines={1}>
        {product.category?.name || 'Uncategorized'}
      </Text>
      {offerOptionsPreview ? (
        <Text style={styles.optionsPreview} numberOfLines={2}>
          {offerOptionsPreview}
        </Text>
      ) : null}
      <Text style={styles.price}>{formatCurrency(basePrice)}</Text>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 132,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    margin: 6,
  },
  cardPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.cream,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 18,
  },
  code: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryHover,
    letterSpacing: 0.4,
  },
  offerTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  optionsBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  optionsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryHover,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  optionsPreview: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 'auto',
  },
});
