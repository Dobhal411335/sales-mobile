import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {
  GridCols,
  ItemStyle,
  MenuHead,
  MenuProduct,
  MenuViewMode,
  PanelLayout,
  ProductHeadMapping,
  TaxRate,
} from '../types/product';
import {fetchMenuData, type MenuData} from '../services/menuService';
import {useCartStore} from '../store/cartStore';
import {scoreMenuSearch} from '../utils/menuSearch';

let cachedMenuData: MenuData | null = null;
let cacheTimestamp = 0;
const MENU_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const LAYOUT_PREF_KEY = 'sales-order-layout';

export function invalidateMenuCache(): void {
  cachedMenuData = null;
  cacheTimestamp = 0;
}

interface UseMenuDataResult {
  categories: string[];
  products: MenuProduct[];
  heads: MenuHead[];
  activeCategory: string;
  activeHead: string;
  viewMode: MenuViewMode;
  panelLayout: PanelLayout;
  itemStyle: ItemStyle;
  gridCols: GridCols;
  searchQuery: string;
  filteredProducts: MenuProduct[];
  globalTaxes: TaxRate[];
  loading: boolean;
  error: string | null;
  setActiveCategory: (category: string) => void;
  setActiveHead: (head: string) => void;
  setViewMode: (mode: MenuViewMode) => void;
  setPanelLayout: (layout: PanelLayout) => void;
  setItemStyle: (style: ItemStyle) => void;
  setGridCols: (cols: GridCols) => void;
  setSearchQuery: (query: string) => void;
  reload: () => void;
}

export function useMenuData(): UseMenuDataResult {
  const [categories, setCategories] = useState<string[]>(['All']);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [heads, setHeads] = useState<MenuHead[]>([{id: 'all', name: 'All'}]);
  const [productHeads, setProductHeads] = useState<ProductHeadMapping[]>([]);
  const [globalTaxes, setGlobalTaxesState] = useState<TaxRate[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeHead, setActiveHead] = useState('All');
  const [viewMode, setViewMode] = useState<MenuViewMode>('list');
  const [panelLayout, setPanelLayoutState] = useState<PanelLayout>('2');
  const [itemStyle, setItemStyleState] = useState<ItemStyle>('list');
  const [gridCols, setGridColsState] = useState<GridCols>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const layoutPrefsLoaded = useRef(false);
  const setGlobalTaxes = useCartStore((state) => state.setGlobalTaxes);

  const loadMenu = useCallback(
    async (force = false) => {
      const isFresh =
        cachedMenuData && Date.now() - cacheTimestamp < MENU_CACHE_TTL_MS;
      if (!force && isFresh) {
        const data = cachedMenuData!;
        setCategories(data.categoryNames);
        setProducts(data.products);
        setHeads(data.heads);
        setProductHeads(data.productHeads);
        setGlobalTaxesState(data.globalTaxes);
        setGlobalTaxes(data.globalTaxes);
        setLoading(false);
        return;
      }

      try {
        if (!cachedMenuData) {
          setLoading(true);
        }
        setError(null);
        const data = await fetchMenuData();
        cachedMenuData = data;
        cacheTimestamp = Date.now();
        setCategories(data.categoryNames);
        setProducts(data.products);
        setHeads(data.heads);
        setProductHeads(data.productHeads);
        setGlobalTaxesState(data.globalTaxes);
        setGlobalTaxes(data.globalTaxes);
      } catch {
        if (!cachedMenuData) {
          setError('Unable to load menu. Check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [setGlobalTaxes],
  );

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

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
          itemStyle?: ItemStyle;
          gridCols?: number;
          viewMode?: MenuViewMode;
        };
        if (prefs.panelLayout === '2' || prefs.panelLayout === '3') {
          setPanelLayoutState(prefs.panelLayout);
        }
        if (prefs.itemStyle === 'tiles' || prefs.itemStyle === 'list') {
          setItemStyleState(prefs.itemStyle);
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
        itemStyle,
        gridCols,
        viewMode,
      }),
    );
  }, [panelLayout, itemStyle, gridCols, viewMode]);

  const setPanelLayout = useCallback((layout: PanelLayout) => {
    setPanelLayoutState(layout);
    if (layout === '3') {
      setItemStyleState('list');
      setViewMode('list');
    }
  }, []);

  const setItemStyle = useCallback((style: ItemStyle) => {
    setItemStyleState(style);
    if (style === 'tiles') {
      setViewMode('grid');
    } else {
      setViewMode('list');
    }
  }, []);

  const setGridCols = useCallback((cols: GridCols) => {
    setGridColsState(cols);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const scoped = products.filter((product) => {
      const productActive = String(product.status || 'Active') !== 'Inactive';
      const categoryActive =
        String(product.category?.status || 'Active') !== 'Inactive';
      if (!productActive || !categoryActive) {
        return false;
      }

      // Offers via head (both panel modes)
      if (activeHead === 'Offer') {
        return Boolean(product.isOffer);
      }
      if (product.isOffer) {
        return false;
      }

      // Category filter (2-panel dropdown + 3-panel sidebar)
      if (
        activeCategory !== 'All' &&
        activeCategory !== 'Offer' &&
        product.category?.name !== activeCategory
      ) {
        return false;
      }

      // Head filter
      if (activeHead !== 'All') {
        const mapping = productHeads.find((ph) => ph.headName === activeHead);
        if (!mapping) {
          return product.category?.name === activeHead;
        }
        return mapping.productIds.includes(product.id);
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
  }, [products, productHeads, activeHead, activeCategory, searchQuery]);

  return {
    categories,
    products,
    heads,
    activeCategory,
    activeHead,
    viewMode,
    panelLayout,
    itemStyle,
    gridCols,
    searchQuery,
    filteredProducts,
    globalTaxes,
    loading,
    error,
    setActiveCategory,
    setActiveHead,
    setViewMode,
    setPanelLayout,
    setItemStyle,
    setGridCols,
    setSearchQuery,
    reload: () => {
      void loadMenu(true);
    },
  };
}
