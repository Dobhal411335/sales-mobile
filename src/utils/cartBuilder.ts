import type {CartLineItem} from '../types/cart';
import type {MenuProduct, TaxRate} from '../types/product';
import {calculateItemTax, nextCartId} from './cartPricing';
import {
  OFFER_CATEGORY,
  buildOfferCartModifier,
  buildOfferOptions,
  cleanOfferList,
} from './offerDetails';

function calculateOfferTax(
  offer: MenuProduct,
  basePrice: number,
  globalTaxes: TaxRate[] = [],
): number {
  if (offer.taxData) {
    const pct = Number(offer.taxData.totalPercentage) || 0;
    const fixed = Number(offer.taxData.totalFixed) || 0;
    return (basePrice * pct) / 100 + fixed;
  }
  return calculateItemTax(offer, basePrice, globalTaxes);
}

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

export function buildOfferCartLine(
  offer: MenuProduct,
  selection: {
    inclusions?: string[];
    choices?: string[];
    drinks?: string[];
  } = {},
  globalTaxes: TaxRate[] = [],
): CartLineItem {
  const price = Number(offer.price) || 0;
  const tax = calculateOfferTax(offer, price, globalTaxes);
  const inclusions = cleanOfferList(
    selection.inclusions ?? offer.inclusions,
  );
  const choices = cleanOfferList(selection.choices);
  const drinks = cleanOfferList(selection.drinks);
  const options = buildOfferOptions({inclusions, choices, drinks});
  const modifier = buildOfferCartModifier({inclusions, choices, drinks});

  return {
    cartId: nextCartId(),
    id: offer.id,
    name: offer.name,
    productCode: '',
    category: OFFER_CATEGORY,
    price,
    tax,
    qty: 1,
    size: 'Standard',
    sizes: [],
    preparationStyle: null,
    options,
    modifier,
    productType: 'KITCHEN',
    taxes: offer.taxes,
    isOffer: true,
    inclusions,
    choices,
    drinks,
  };
}
