import {useCallback, useEffect, useMemo, useState} from 'react';
import type {
  MenuHead,
  MenuProduct,
  MenuViewMode,
  ProductHeadMapping,
  TaxRate,
} from '../types/product';
import {fetchMenuData, type MenuData} from '../services/menuService';
import {useCartStore} from '../store/cartStore';
import {scoreMenuSearch} from '../utils/menuSearch';

let cachedMenuData: MenuData | null = null;
let cacheTimestamp = 0;
const MENU_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

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
  searchQuery: string;
  filteredProducts: MenuProduct[];
  globalTaxes: TaxRate[];
  loading: boolean;
  error: string | null;
  setActiveCategory: (category: string) => void;
  setActiveHead: (head: string) => void;
  setViewMode: (mode: MenuViewMode) => void;
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
  const [viewMode, setViewMode] = useState<MenuViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const scoped = products.filter((product) => {
      const productActive = String(product.status || 'Active') !== 'Inactive';
      const categoryActive =
        String(product.category?.status || 'Active') !== 'Inactive';
      if (!productActive || !categoryActive) {
        return false;
      }

      if (viewMode === 'grid') {
        if (activeHead === 'Offer') {
          return Boolean(product.isOffer);
        }
        if (product.isOffer) {
          return false;
        }
        if (activeHead !== 'All') {
          const mapping = productHeads.find((ph) => ph.headName === activeHead);
          if (!mapping) {
            return product.category?.name === activeHead;
          }
          return mapping.productIds.includes(product.id);
        }
        return true;
      }

      if (activeCategory === 'Offer') {
        return Boolean(product.isOffer);
      }
      if (product.isOffer) {
        return activeCategory === 'All';
      }
      if (
        activeCategory !== 'All' &&
        product.category?.name !== activeCategory
      ) {
        return false;
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
      .sort((a, b) => a.score - b.score || a.product.name.localeCompare(b.product.name))
      .map((entry) => entry.product);
  }, [
    products,
    productHeads,
    viewMode,
    activeHead,
    activeCategory,
    searchQuery,
  ]);

  return {
    categories,
    products,
    heads,
    activeCategory,
    activeHead,
    viewMode,
    searchQuery,
    filteredProducts,
    globalTaxes,
    loading,
    error,
    setActiveCategory,
    setActiveHead,
    setViewMode,
    setSearchQuery,
    reload: () => {
      void loadMenu(true);
    },
  };
}
