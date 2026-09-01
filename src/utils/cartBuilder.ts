import type {CartLineItem} from '../types/cart';
import type {MenuProduct, TaxRate} from '../types/product';
import {calculateItemTax, nextCartId} from './cartPricing';

export function buildSimpleCartLine(
  product: MenuProduct,
  globalTaxes: TaxRate[] = [],
): CartLineItem {
  const price = product.price || 0;
  const tax = calculateItemTax(product, price, globalTaxes);

  return {
    cartId: nextCartId(),
    id: product.id,
    name: product.name,
    productCode: product.productCode,
    category: product.category?.name || 'ITEMS',
    price,
    tax,
    qty: 1,
    size: 'Standard',
    productType: product.productType,
    taxes: product.taxes,
    preparationStyle: null,
  };
}
