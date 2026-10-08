import React, {useCallback} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  FlatList,
  type ListRenderItem,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {GridCols, MenuProduct} from '../../types/product';
import {ProductCard} from './ProductCard';
import {ProductGridSkeleton} from './ProductGridSkeleton';
import {prefetchMenuImages} from '../../menu/imageCache';

interface ProductGridProps {
  products: MenuProduct[];
  loading: boolean;
  error: string | null;
  onProductPress: (product: MenuProduct) => void;
  gridCols?: GridCols;
  /** No local product cache — guide employee to Sync products. */
  needsProductSync?: boolean;
  onSyncProducts?: () => void;
  onRetry?: () => void;
  searchQuery?: string;
}

export function ProductGrid({
  products,
  loading,
  error,
  onProductPress,
  gridCols = 4,
  needsProductSync = false,
  onSyncProducts,
  onRetry,
  searchQuery = '',
}: ProductGridProps) {
  const numColumns = gridCols;

  const renderItem = useCallback<ListRenderItem<MenuProduct>>(
    ({item}) => (
      <View style={[styles.cell, {width: `${100 / numColumns}%`}]}>
        <ProductCard product={item} onPress={onProductPress} />
      </View>
    ),
    [numColumns, onProductPress],
  );

  const keyExtractor = useCallback((item: MenuProduct) => item.id, []);

  const onViewableItemsChanged = useCallback(() => {
    prefetchMenuImages(16);
  }, []);

  if (loading) {
    return <ProductGridSkeleton gridCols={gridCols} />;
  }

  if (needsProductSync) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyTitle}>Products not available on this device</Text>
        <Text style={styles.stateText}>
          Menu items have not been synced to this tablet yet. Open Sync products
          to download the latest menu, then return here to create orders.
        </Text>
        {onSyncProducts ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={onSyncProducts}
            accessibilityRole="button"
            accessibilityLabel="Go to Sync products">
            <Text style={styles.primaryBtnText}>Sync products</Text>
          </Pressable>
        ) : null}
        {onRetry ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Try syncing again">
            <Text style={styles.secondaryBtnText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Unable to load menu.</Text>
        <Text style={styles.stateText}>
          {error || 'Check your connection and try again.'}
        </Text>
        {onRetry ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again">
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        ) : null}
        {onSyncProducts ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={onSyncProducts}
            accessibilityRole="button"
            accessibilityLabel="Go to Sync products">
            <Text style={styles.secondaryBtnText}>Sync products</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (!products.length) {
    const hasSearch = Boolean(searchQuery.trim());
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateText}>
          {hasSearch
            ? 'No items match your search.'
            : 'No items found for this filter.'}
        </Text>
      </View>
    );
  }

  // Fingerprint prices so Android FlatList refreshes cells after menu sync
  const priceEpoch = products
    .slice(0, 40)
    .map((p) =>
      p.variants?.length
        ? p.variants.map((v) => v.price).join(',')
        : String(p.price ?? 0),
    )
    .join(';');

  return (
    <FlatList
      data={products}
      // Remount only when column count changes (required by RN FlatList)
      key={`cols-${numColumns}`}
      numColumns={numColumns}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      extraData={`${products.length}:${priceEpoch}`}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={5}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{itemVisiblePercentThreshold: 10}}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 8,
    paddingBottom: 24,
  },
  columnWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    padding: 6,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  stateText: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 420,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.error,
    textAlign: 'center',
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 180,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 180,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
