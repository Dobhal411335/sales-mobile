import React, {memo, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {ItemStyle, MenuProduct} from '../../types/product';
import {productNeedsOptions} from '../../types/product';
import {formatCurrency} from '../../utils/currency';
import {cleanOfferList, offerNeedsOptions} from '../../utils/offerDetails';

interface ProductCardProps {
  product: MenuProduct;
  onPress: (product: MenuProduct) => void;
  variant?: ItemStyle;
}

const TILE_THEMES = [
  {bg: '#ECFDF5', border: '#A7F3D0', codeBg: '#059669'},
  {bg: '#F0F9FF', border: '#BAE6FD', codeBg: '#0284C7'},
  {bg: '#FFFBEB', border: '#FDE68A', codeBg: '#B45309'},
  {bg: '#EEF2FF', border: '#C7D2FE', codeBg: '#4F46E5'},
  {bg: '#FFF1F2', border: '#FECDD3', codeBg: '#E11D48'},
  {bg: '#F0FDFA', border: '#99F6E4', codeBg: '#0F766E'},
  {bg: '#FFF7ED', border: '#FED7AA', codeBg: '#EA580C'},
  {bg: '#F5F3FF', border: '#DDD6FE', codeBg: '#7C3AED'},
] as const;

function getOfferOptionPreview(product: MenuProduct): string {
  const parts = [
    ...cleanOfferList(product.inclusions),
    ...cleanOfferList(product.choices),
    ...cleanOfferList(product.drinks),
  ];
  return parts.join(' · ');
}

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function ProductCardComponent({
  product,
  onPress,
  variant = 'list',
}: ProductCardProps) {
  const isOffer = Boolean(product.isOffer);
  const hasOptions = isOffer
    ? offerNeedsOptions(product)
    : productNeedsOptions(product);
  const offerOptionsPreview = isOffer ? getOfferOptionPreview(product) : '';
  const basePrice =
    product.variants && product.variants.length > 0
      ? product.variants[0].price
      : product.price;
  const isAvailable = product.inStock !== false;

  const theme = useMemo(() => {
    const idx = hashKey(product.id || product.name) % TILE_THEMES.length;
    return TILE_THEMES[idx];
  }, [product.id, product.name]);

  if (variant === 'tiles') {
    return (
      <Pressable
        style={({pressed}) => [
          styles.tile,
          {
            backgroundColor: theme.bg,
            borderColor: theme.border,
            opacity: isAvailable ? 1 : 0.45,
          },
          pressed && isAvailable && styles.tilePressed,
        ]}
        disabled={!isAvailable}
        onPress={() => onPress(product)}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatCurrency(basePrice)}`}>
        {product.productCode || isOffer ? (
          <View style={[styles.tileCode, {backgroundColor: theme.codeBg}]}>
            <Text style={styles.tileCodeText}>
              {product.productCode || 'Offer'}
            </Text>
          </View>
        ) : null}
        {!isAvailable ? (
          <View style={styles.tileOut}>
            <Text style={styles.tileOutText}>Out</Text>
          </View>
        ) : null}
        <Text style={styles.tileName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.tilePrice}>{formatCurrency(basePrice)}</Text>
        <View
          style={[
            styles.tileAction,
            hasOptions ? styles.tileActionOptions : styles.tileActionAdd,
          ]}>
          <Text
            style={[
              styles.tileActionText,
              hasOptions
                ? styles.tileActionTextOptions
                : styles.tileActionTextAdd,
            ]}>
            {hasOptions ? 'Options' : 'Add'}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatCurrency(basePrice)}`}>
      <View style={styles.headerRow}>
        {product.productCode ? (
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{product.productCode}</Text>
          </View>
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
  codeBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryHover,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
    color: colors.primaryHover,
    marginTop: 'auto',
  },
  tile: {
    flex: 1,
    minHeight: 132,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingTop: 28,
    paddingBottom: 10,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tilePressed: {
    opacity: 0.88,
  },
  tileCode: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileCodeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  tileOut: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileOutText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  tileName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  tilePrice: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryHover,
  },
  tileAction: {
    marginTop: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tileActionOptions: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileActionAdd: {
    backgroundColor: colors.primary,
  },
  tileActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tileActionTextOptions: {
    color: colors.text,
  },
  tileActionTextAdd: {
    color: '#FFFFFF',
  },
});
