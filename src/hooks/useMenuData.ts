import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import type {
  GridCols,
  MenuHead,
  MenuProduct,
  MenuViewMode,
  PanelLayout,
  ProductHeadMapping,
  TaxRate,
} from '../types/product';
import {useCartStore} from '../store/cartStore';
import {scoreMenuSearch} from '../utils/menuSearch';
import {
  menuSyncManager,
  type MenuSyncStatus,
} from '../menu/menuSyncManager';

const LAYOUT_PREF_KEY = 'sales-order-layout-v2';

/** @deprecated Prefer menuSyncManager.markStale() / sync — kept for callers */
export function invalidateMenuCache(): void {
  menuSyncManager.markStale();
}

interface UseMenuDataResult {
  categories: string[];
  products: MenuProduct[];
  heads: MenuHead[];
  activeCategory: string;
  activeHead: string;
  viewMode: MenuViewMode;
  panelLayout: PanelLayout;
  gridCols: GridCols;
  searchQuery: string;
  filteredProducts: MenuProduct[];
  globalTaxes: TaxRate[];
  loading: boolean;
  error: string | null;
  /** True when SQLite has cached menu rows for this device. */
  hasLocalData: boolean;
  /**
   * True when Create Order should show the "sync products" empty state
   * (no local products after hydrate/sync settled — not a filter miss).
   */
  needsProductSync: boolean;
  syncStatus: MenuSyncStatus;
  lastSyncedAt: string | null;
  setActiveCategory: (category: string) => void;
  setActiveHead: (head: string) => void;
  setViewMode: (mode: MenuViewMode) => void;
  setPanelLayout: (layout: PanelLayout) => void;
  setGridCols: (cols: GridCols) => void;
  setSearchQuery: (query: string) => void;
  reload: () => void;
}

function subscribeMenuSync(onStoreChange: () => void) {
  return menuSyncManager.subscribe(() => onStoreChange());
}

function getMenuSyncSnapshot() {
  return menuSyncManager.getState();
}

export function useMenuData(): UseMenuDataResult {
  const syncState = useSyncExternalStore(
    subscribeMenuSync,
    getMenuSyncSnapshot,
    getMenuSyncSnapshot,
  );

  const [activeCategory, setActiveCategory] = useState('All');
  const [activeHead, setActiveHead] = useState('All');
  const [viewMode, setViewMode] = useState<MenuViewMode>('grid');
  const [panelLayout, setPanelLayoutState] = useState<PanelLayout>('3');
  const [gridCols, setGridColsState] = useState<GridCols>(4);
  const [searchQuery, setSearchQuery] = useState('');
  const layoutPrefsLoaded = useRef(false);
  const setGlobalTaxes = useCartStore((state) => state.setGlobalTaxes);

  const products = useMemo(
    () => syncState.menu?.products ?? [],
    [syncState.menu?.products],
  );
  const heads = useMemo(
    () => syncState.menu?.heads ?? [{id: 'all', name: 'All'}],
    [syncState.menu?.heads],
  );
  const productHeads = useMemo(
    () => syncState.menu?.productHeads ?? [],
    [syncState.menu?.productHeads],
  );
  const globalTaxes = useMemo(
    () => syncState.menu?.globalTaxes ?? [],
    [syncState.menu?.globalTaxes],
  );
  const categories = useMemo(
    () => syncState.menu?.categoryNames ?? ['All'],
    [syncState.menu?.categoryNames],
  );

  useEffect(() => {
    void menuSyncManager.ensureReady();
  }, []);

  useEffect(() => {
    if (globalTaxes.length) {
      setGlobalTaxes(globalTaxes);
    }
  }, [globalTaxes, setGlobalTaxes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LAYOUT_PREF_KEY);
        if (!raw || cancelled) {
          layoutPrefsLoaded.current = true;
          return;
        }
        const prefs = JSON.parse(raw) as {
          panelLayout?: PanelLayout;
          gridCols?: number;
          viewMode?: MenuViewMode;
        };
        if (prefs.panelLayout === '2' || prefs.panelLayout === '3') {
          setPanelLayoutState(prefs.panelLayout);
        }
        if ([2, 3, 4].includes(Number(prefs.gridCols))) {
          setGridColsState(Number(prefs.gridCols) as GridCols);
        }
        if (prefs.viewMode === 'grid' || prefs.viewMode === 'list') {
          setViewMode(prefs.viewMode);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          layoutPrefsLoaded.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!layoutPrefsLoaded.current) {
      return;
    }
    void AsyncStorage.setItem(
      LAYOUT_PREF_KEY,
      JSON.stringify({
        panelLayout,
        gridCols,
        viewMode,
      }),
    );
  }, [panelLayout, gridCols, viewMode]);

  const setPanelLayout = useCallback((layout: PanelLayout) => {
    setPanelLayoutState(layout);
    if (layout === '3') {
      setGridColsState(2);
    }
  }, []);

  const setGridCols = useCallback((cols: GridCols) => {
    setGridColsState(cols);
  }, []);

  const productIdsByHead = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const ph of productHeads as ProductHeadMapping[]) {
      map.set(ph.headName, new Set(ph.productIds));
    }
    return map;
  }, [productHeads]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const scoped = products.filter((product) => {
      const productActive = String(product.status || 'Active') !== 'Inactive';
      const categoryActive =
        String(product.category?.status || 'Active') !== 'Inactive';
      if (!productActive || !categoryActive) {
        return false;
      }

      if (activeHead === 'Offer') {
        return Boolean(product.isOffer);
      }
      if (product.isOffer) {
        return false;
      }

      if (
        activeCategory !== 'All' &&
        activeCategory !== 'Offer' &&
        product.category?.name !== activeCategory
      ) {
        return false;
      }

      if (activeHead !== 'All') {
        const ids = productIdsByHead.get(activeHead);
        if (!ids) {
          return product.category?.name === activeHead;
        }
        return ids.has(product.id);
      }

      return true;
    });

    if (!query) {
      return scoped;
    }

    return scoped
      .map((product) => ({
        product,
        score: scoreMenuSearch(
          [
            product.name,
            product.productCode,
            product.category?.name,
            ...(product.inclusions || []),
            ...(product.choices || []),
            ...(product.drinks || []),
          ],
          query,
        ),
      }))
      .filter(
        (entry): entry is {product: MenuProduct; score: number} =>
          entry.score !== null,
      )
      .sort(
        (a, b) =>
          a.score - b.score || a.product.name.localeCompare(b.product.name),
      )
      .map((entry) => entry.product);
  }, [products, productIdsByHead, activeHead, activeCategory, searchQuery]);

  const productCount = syncState.menu?.products?.length ?? 0;
  const loading =
    (productCount === 0 &&
      (syncState.status === 'hydrating' ||
        syncState.status === 'syncing' ||
        syncState.status === 'idle')) ||
    (!syncState.hasLocalData &&
      (syncState.status === 'hydrating' ||
        syncState.status === 'syncing' ||
        syncState.status === 'idle'));

  const error =
    syncState.status === 'error' ||
    (productCount === 0 && syncState.error)
      ? syncState.error
      : null;

  const settled =
    syncState.status === 'ready' ||
    syncState.status === 'error' ||
    syncState.status === 'offline';
  // Empty local menu after sync settled — not a category/search filter miss
  const needsProductSync = settled && !loading && productCount === 0;

  return {
    categories,
    products,
    heads,
    activeCategory,
    activeHead,
    viewMode,
    panelLayout,
    gridCols,
    searchQuery,
    filteredProducts,
    globalTaxes,
    loading,
    error,
    hasLocalData: syncState.hasLocalData,
    needsProductSync,
    syncStatus: syncState.status,
    lastSyncedAt: syncState.lastSyncedAt,
    setActiveCategory,
    setActiveHead,
    setViewMode,
    setPanelLayout,
    setGridCols,
    setSearchQuery,
    reload: () => {
      void menuSyncManager.sync({forceFull: true});
    },
  };
}
