import React, {useCallback} from 'react';
import {
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
}

export function ProductGrid({
  products,
  loading,
  error,
  onProductPress,
  gridCols = 2,
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

  if (error) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Unable to load menu.</Text>
        <Text style={styles.stateText}>
          Check your connection and try again.
        </Text>
      </View>
    );
  }

  if (!products.length) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateText}>No items found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      // Remount only when column count changes (required by RN FlatList)
      key={`cols-${numColumns}`}
      numColumns={numColumns}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
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
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.error,
    textAlign: 'center',
  },
});
