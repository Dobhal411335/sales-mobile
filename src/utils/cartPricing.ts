/**
 * Pre-KOT cart pricing preview.
 * After KOT, server order totals are authoritative.
 */
import type {AppliedDiscount, CartLineItem, CartTotals} from '../types/cart';
import type {TaxRate} from '../types/product';
import {cartChoiceSelectionsKey, normalizeChoiceSelections} from './productChoices';

export function calculateItemTax(
  item: {taxes?: TaxRate[]},
  basePrice: number,
  globalTaxes: TaxRate[] = [],
): number {
  const taxesToUse =
    item.taxes && item.taxes.length > 0 ? item.taxes : globalTaxes;
  if (!taxesToUse.length) {
    return 0;
  }

  const pctTaxes = taxesToUse
    .filter((tax) => tax.type?.toLowerCase().includes('percent'))
    .reduce((sum, tax) => sum + (tax.value || 0), 0);
  const fixedTaxes = taxesToUse
    .filter((tax) => tax.type && !tax.type.toLowerCase().includes('percent'))
    .reduce((sum, tax) => sum + (tax.value || 0), 0);

  return (basePrice * pctTaxes) / 100 + fixedTaxes;
}

export function buildCartTotals(
  items: CartLineItem[],
  _globalTaxes: TaxRate[] = [],
  discount?: AppliedDiscount | null,
): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxTotal = items.reduce((sum, item) => sum + item.tax * item.qty, 0);

  let discountTotal = 0;
  if (discount) {
    discountTotal =
      discount.type === 'percent'
        ? (subtotal * discount.value) / 100
        : Math.min(discount.value, subtotal);
  }

  return {
    subtotal,
    taxTotal,
    discountTotal,
    total: subtotal - discountTotal + taxTotal,
  };
}

function sortedOptions(options: string[] = []): string[] {
  return [...options].sort();
}

export function isSameCartLine(a: CartLineItem, b: CartLineItem): boolean {
  return (
    a.id === b.id &&
    (a.size || '') === (b.size || '') &&
    (a.preparationStyle || '') === (b.preparationStyle || '') &&
    a.price === b.price &&
    Boolean(a.isOffer) === Boolean(b.isOffer) &&
    JSON.stringify(sortedOptions(a.options)) ===
      JSON.stringify(sortedOptions(b.options)) &&
    cartChoiceSelectionsKey(a.choiceSelections) ===
      cartChoiceSelectionsKey(b.choiceSelections) &&
    cartChoiceSelectionsKey(a.addonChoiceSelections) ===
      cartChoiceSelectionsKey(b.addonChoiceSelections)
  );
}

export function mergeCartLines(
  current: CartLineItem[],
  incoming: CartLineItem[],
): CartLineItem[] {
  const next = [...current];

  incoming.forEach((line) => {
    const index = next.findIndex((item) => isSameCartLine(item, line));
    if (index >= 0) {
      next[index] = {
        ...next[index],
        qty: next[index].qty + line.qty,
      };
      return;
    }
    next.push(line);
  });

  return next;
}

export function getCartFingerprint(items: CartLineItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      qty: item.qty,
      size: item.size,
      price: item.price,
      preparationStyle: item.preparationStyle,
      options: sortedOptions(item.options),
      choiceSelections: normalizeChoiceSelections(item.choiceSelections),
      addonChoiceSelections: normalizeChoiceSelections(
        item.addonChoiceSelections,
      ),
    })),
  );
}

let cartSequence = 0;

export function nextCartId(): string {
  cartSequence += 1;
  return `c-${Date.now()}-${cartSequence}`;
}
