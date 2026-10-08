import React, {memo, useMemo} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {MenuProduct} from '../../types/product';
import {productNeedsOptions} from '../../types/product';
import {formatCurrency} from '../../utils/currency';
import {offerNeedsOptions} from '../../utils/offerDetails';
import {toThumbnailUrl} from '../../menu/imageCache';

interface ProductCardProps {
  product: MenuProduct;
  onPress: (product: MenuProduct) => void;
}

const TILE_THEMES = [
  {bg: '#ECFDF5', border: '#A7F3D0'},
  {bg: '#F0F9FF', border: '#BAE6FD'},
  {bg: '#FFFBEB', border: '#FDE68A'},
  {bg: '#EEF2FF', border: '#C7D2FE'},
  {bg: '#FFF1F2', border: '#FECDD3'},
  {bg: '#F0FDFA', border: '#99F6E4'},
  {bg: '#FFF7ED', border: '#FED7AA'},
  {bg: '#F5F3FF', border: '#DDD6FE'},
] as const;

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function ProductCardComponent({product, onPress}: ProductCardProps) {
  const isOffer = Boolean(product.isOffer);
  const hasOptions = isOffer
    ? offerNeedsOptions(product)
    : productNeedsOptions(product);
  const basePrice =
    product.variants && product.variants.length > 0
      ? product.variants[0].price
      : product.price;
  const isAvailable = product.inStock !== false;
  const code = String(product.productCode || '').trim();
  const imageUrl = product.imageUrl
    ? product.imageUrl.startsWith('file:')
      ? product.imageUrl
      : toThumbnailUrl(product.imageUrl)
    : undefined;

  const theme = useMemo(() => {
    const idx = hashKey(product.id || product.name) % TILE_THEMES.length;
    return TILE_THEMES[idx];
  }, [product.id, product.name]);

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
      accessibilityLabel={`${code ? `${code} ` : ''}${product.name}, ${formatCurrency(basePrice)}`}>
      {imageUrl ? (
        <View style={styles.tileImageWrap}>
          <Image
            source={{uri: imageUrl}}
            style={styles.tileImage}
            resizeMode="cover"
          />
        </View>
      ) : null}
      {!isAvailable ? (
        <View style={styles.tileOut}>
          <Text style={styles.tileOutText}>Out</Text>
        </View>
      ) : null}
      <View style={[styles.tileBody, !imageUrl && styles.tileBodyNoImage]}>
        <View style={styles.titleRow}>
          {code ? (
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>{code}</Text>
            </View>
          ) : isOffer ? (
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>Offer</Text>
            </View>
          ) : null}
          <Text style={styles.tileName} numberOfLines={2}>
            {product.name}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.tilePrice}>{formatCurrency(basePrice)}</Text>
          <View style={styles.tileAction}>
            <Text style={styles.tileActionText}>
              {hasOptions ? 'Options' : 'Add'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function productPriceSignature(product: MenuProduct): string {
  if (product.variants?.length) {
    return product.variants
      .map((v) => `${v.size}:${Number(v.price) || 0}`)
      .join('|');
  }
  return String(Number(product.price) || 0);
}

export const ProductCard = memo(ProductCardComponent, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.name === next.product.name &&
    prev.product.imageUrl === next.product.imageUrl &&
    prev.product.inStock === next.product.inStock &&
    prev.product.productCode === next.product.productCode &&
    productPriceSignature(prev.product) ===
      productPriceSignature(next.product) &&
    prev.onPress === next.onPress
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  tilePressed: {
    opacity: 0.88,
  },
  tileImageWrap: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#F4F4F5',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileOut: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
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
  tileBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  tileBodyNoImage: {
    minHeight: 96,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    width: '100%',
    minHeight: 36,
  },
  codeBadge: {
    flexShrink: 0,
    marginTop: 1,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryHover,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tileName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'left',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    marginTop: 'auto',
  },
  tilePrice: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryHover,
  },
  tileAction: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primary,
  },
  tileActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
