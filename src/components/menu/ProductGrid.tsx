import React, {useCallback, useMemo} from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  FlatList,
  type ListRenderItem,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {GridCols, ItemStyle, MenuProduct} from '../../types/product';
import {ProductCard} from './ProductCard';
import {ProductGridSkeleton} from './ProductGridSkeleton';
import {prefetchMenuImages} from '../../menu/imageCache';

interface ProductGridProps {
  products: MenuProduct[];
  loading: boolean;
  error: string | null;
  onProductPress: (product: MenuProduct) => void;
  itemStyle?: ItemStyle;
  gridCols?: GridCols;
}

export function ProductGrid({
  products,
  loading,
  error,
  onProductPress,
  itemStyle = 'list',
  gridCols = 2,
}: ProductGridProps) {
  const {width} = useWindowDimensions();

  const numColumns = useMemo(() => {
    if (itemStyle === 'tiles') {
      return gridCols;
    }
    return width >= 1100 ? 2 : 1;
  }, [itemStyle, gridCols, width]);

  const variant: ItemStyle = itemStyle === 'tiles' ? 'tiles' : 'list';

  const renderItem = useCallback<ListRenderItem<MenuProduct>>(
    ({item}) => (
      <ProductCard product={item} onPress={onProductPress} variant={variant} />
    ),
    [onProductPress, variant],
  );

  const keyExtractor = useCallback((item: MenuProduct) => item.id, []);

  const onViewableItemsChanged = useCallback(() => {
    prefetchMenuImages(16);
  }, []);

  if (loading) {
    return (
      <ProductGridSkeleton itemStyle={itemStyle} gridCols={gridCols} />
    );
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
    padding: 10,
    paddingBottom: 24,
  },
  columnWrap: {
    gap: 0,
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
