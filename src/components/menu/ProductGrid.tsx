import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {MenuProduct} from '../../types/product';
import {ProductCard} from './ProductCard';

interface ProductGridProps {
  products: MenuProduct[];
  loading: boolean;
  error: string | null;
  onProductPress: (product: MenuProduct) => void;
}

export function ProductGrid({
  products,
  loading,
  error,
  onProductPress,
}: ProductGridProps) {
  const {width} = useWindowDimensions();
  const numColumns = width >= 1100 ? 3 : 2;

  const data = useMemo(() => products, [products]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Loading menu...</Text>
      </View>
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

  if (!data.length) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateText}>No items found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      key={numColumns}
      numColumns={numColumns}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrap : undefined}
      renderItem={({item}) => (
        <ProductCard product={item} onPress={onProductPress} />
      )}
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
