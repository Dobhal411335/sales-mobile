import React, {memo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {CategorySidebar} from './CategorySidebar';
import {HeadList} from './HeadList';
import {MenuListFilters} from './MenuListFilters';
import {OrderLayoutMenu} from './OrderLayoutMenu';
import {ProductGrid} from './ProductGrid';
import {ProductGridSkeleton} from './ProductGridSkeleton';
import type {
  GridCols,
  MenuHead,
  MenuProduct,
  PanelLayout,
} from '../../types/product';
import {colors} from '../../constants/colors';

interface CreateOrderMenuPaneProps {
  panelLayout: PanelLayout;
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  heads: MenuHead[];
  activeHead: string;
  onSelectHead: (head: string) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  gridCols: GridCols;
  onPanelLayout: (layout: PanelLayout) => void;
  onGridCols: (cols: GridCols) => void;
  headerTitle: string;
  partyLabel: string;
  products: MenuProduct[];
  loading: boolean;
  error: string | null;
  onProductPress: (product: MenuProduct) => void;
  syncBanner?: string | null;
  showSessionLoader?: boolean;
  needsProductSync?: boolean;
  onSyncProducts?: () => void;
  onRetryMenu?: () => void;
  searchQueryForEmpty?: string;
}

function CreateOrderMenuPaneComponent({
  panelLayout,
  categories,
  activeCategory,
  onSelectCategory,
  heads,
  activeHead,
  onSelectHead,
  searchQuery,
  onChangeSearch,
  gridCols,
  onPanelLayout,
  onGridCols,
  headerTitle,
  partyLabel,
  products,
  loading,
  error,
  onProductPress,
  syncBanner,
  showSessionLoader,
  needsProductSync,
  onSyncProducts,
  onRetryMenu,
  searchQueryForEmpty,
}: CreateOrderMenuPaneProps) {
  return (
    <>
      {panelLayout === '3' ? (
        <CategorySidebar
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
        />
      ) : null}

      <View style={styles.menuPane}>
        {syncBanner ? (
          <View style={styles.syncBanner}>
            <Text style={styles.syncBannerText}>{syncBanner}</Text>
          </View>
        ) : null}

        <View style={styles.contextHeader}>
          <View style={styles.contextHeaderText}>
            <Text style={styles.screenTitle}>{headerTitle}</Text>
            <Text style={styles.contextSubtitle}>{partyLabel}</Text>
          </View>
          <OrderLayoutMenu
            panelLayout={panelLayout}
            gridCols={gridCols}
            onPanelLayout={onPanelLayout}
            onGridCols={onGridCols}
          />
        </View>

        <MenuListFilters
          categories={categories}
          activeCategory={activeCategory}
          searchQuery={searchQuery}
          onChangeSearch={onChangeSearch}
          onSelectCategory={onSelectCategory}
          showCategory={panelLayout === '2'}
        />

        <HeadList
          heads={heads}
          activeHead={activeHead}
          onSelectHead={onSelectHead}
        />

        {showSessionLoader ? (
          <ProductGridSkeleton gridCols={gridCols} />
        ) : (
          <ProductGrid
            products={products}
            loading={loading}
            error={error}
            onProductPress={onProductPress}
            gridCols={gridCols}
            needsProductSync={needsProductSync}
            onSyncProducts={onSyncProducts}
            onRetry={onRetryMenu}
            searchQuery={searchQueryForEmpty ?? searchQuery}
          />
        )}
      </View>
    </>
  );
}

export const CreateOrderMenuPane = memo(CreateOrderMenuPaneComponent);

const styles = StyleSheet.create({
  menuPane: {
    flex: 1,
    minWidth: 0,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  contextHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  contextSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  syncBanner: {
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
  },
});
