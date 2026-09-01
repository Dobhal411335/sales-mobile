import {getMockMenuData} from '../mocks/menuMockData';
import type {MenuCategory, MenuOffer, MenuProduct, TaxRate} from '../types/product';

export interface MenuData {
  categories: MenuCategory[];
  products: MenuProduct[];
  offers: MenuOffer[];
  globalTaxes: TaxRate[];
  categoryNames: string[];
}

/**
 * Menu data service.
 * Currently returns mock data; swap implementation to use api.ts when backend is wired.
 */
export async function fetchMenuData(): Promise<MenuData> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });

  return getMockMenuData();
}
