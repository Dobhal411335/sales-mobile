import {useCallback, useEffect, useMemo, useState} from 'react';
import type {MenuProduct, TaxRate} from '../types/product';
import {fetchMenuData} from '../services/menuService';
import {useCartStore} from '../store/cartStore';

interface UseMenuDataResult {
  categories: string[];
  products: MenuProduct[];
  activeCategory: string;
  filteredProducts: MenuProduct[];
  globalTaxes: TaxRate[];
  loading: boolean;
  error: string | null;
  setActiveCategory: (category: string) => void;
  reload: () => void;
}

export function useMenuData(): UseMenuDataResult {
  const [categories, setCategories] = useState<string[]>(['All']);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [globalTaxes, setGlobalTaxesState] = useState<TaxRate[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setGlobalTaxes = useCartStore((state) => state.setGlobalTaxes);

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMenuData();
      setCategories(data.categoryNames);
      setProducts(data.products);
      setGlobalTaxesState(data.globalTaxes);
      setGlobalTaxes(data.globalTaxes);
    } catch {
      setError('Unable to load menu. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [setGlobalTaxes]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const productActive = String(product.status || 'Active') !== 'Inactive';
      const categoryActive =
        String(product.category?.status || 'Active') !== 'Inactive';
      if (!productActive || !categoryActive) {
        return false;
      }
      if (activeCategory === 'All') {
        return true;
      }
      return product.category?.name === activeCategory;
    });
  }, [products, activeCategory]);

  return {
    categories,
    products,
    activeCategory,
    filteredProducts,
    globalTaxes,
    loading,
    error,
    setActiveCategory,
    reload: loadMenu,
  };
}
