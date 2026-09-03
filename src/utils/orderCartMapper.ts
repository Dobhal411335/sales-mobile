import type {AppliedDiscount, CartLineItem} from '../types/cart';
import type {ApiOrder, ApiOrderItem} from '../types/order';
import type {CartTotals} from '../types/cart';
import {getCartFingerprint} from './cartPricing';
import {
  OFFER_CATEGORY,
  buildOfferCartModifier,
  cleanOfferList,
  isOfferItem,
} from './offerDetails';
import {normalizeChoiceSelections} from './productChoices';

export function buildCartFromOrderItems(items: ApiOrderItem[] = []): CartLineItem[] {
  return items.map((item, idx) => {
    const style = item.preparationStyle || null;
    const extras = (item.options || []).filter(
      (option) => !String(option).toLowerCase().startsWith('style:'),
    );
    const offer = isOfferItem(item);
    const inclusions = cleanOfferList(item.inclusions);
    const choices = cleanOfferList(item.choices);
    const drinks = cleanOfferList(item.drinks);
    const parts: string[] = [];

    if (item.size && item.size !== 'Standard') {
      parts.push(`Size: ${item.size}`);
    }
    if (style) {
      parts.push(style);
    }
    if (offer) {
      const offerModifier = buildOfferCartModifier({
        inclusions,
        choices,
        drinks,
      });
      if (offerModifier) {
        parts.push(offerModifier);
      }
    } else if (extras.length > 0) {
      parts.push(`Extras: ${extras.join(', ')}`);
    }

    return {
      id: item.menuItemId || item.cartId || `item-${idx}`,
      name: item.name,
      productCode: item.productCode || '',
      category: offer ? OFFER_CATEGORY : item.category || 'ITEMS',
      price: item.price,
      tax: item.tax ?? 0,
      serviceCharge: item.serviceCharge || 0,
      qty: item.qty,
      size: item.size,
      sizes:
        item.sizes ||
        (item.size && item.size !== 'Standard'
          ? String(item.size).split(', ').filter(Boolean)
          : []),
      preparationStyle: style,
      options: item.options || [],
      productType:
        item.productType === 'BAR' ? 'BAR' : 'KITCHEN',
      isOffer: offer,
      inclusions,
      choices,
      drinks,
      choiceSelections: normalizeChoiceSelections(item.choiceSelections),
      addonChoiceSelections: normalizeChoiceSelections(
        item.addonChoiceSelections,
      ),
      modifier: parts.length > 0 ? parts.join(' | ') : undefined,
      cartId: item.cartId || `r-${Date.now()}-${idx}`,
    };
  });
}

export function mapOrderToCartTotals(order: ApiOrder): CartTotals {
  return {
    subtotal: Number(order.subTotal) || 0,
    taxTotal: Number(order.taxTotal) || 0,
    discountTotal: Number(order.discountTotal) || 0,
    total: Number(order.totalAmount) || 0,
  };
}

export function mapOrderToAppliedDiscount(
  order: ApiOrder,
): AppliedDiscount | null {
  if (!order.discountCode || !order.discountTotal) {
    return null;
  }
  return {
    code: order.discountCode,
    type: 'fixed',
    value: Number(order.discountTotal) || 0,
  };
}

export function computeHasSentKot(
  order: ApiOrder,
  items: CartLineItem[],
): boolean {
  const status = String(order.status || '').toUpperCase();
  if (status === 'DRAFT' || !items.length) {
    return false;
  }
  const fingerprint = getCartFingerprint(items);
  return fingerprint.length > 2;
}

export interface HydrateCartFromOrderResult {
  items: CartLineItem[];
  hasSentKot: boolean;
  kotCartFingerprint: string | null;
  persistedTotals: CartTotals;
  appliedDiscount: AppliedDiscount | null;
}

export function hydrateCartFromOrder(order: ApiOrder): HydrateCartFromOrderResult {
  const items = buildCartFromOrderItems(order.items);
  const fingerprint = getCartFingerprint(items);
  const status = String(order.status || '').toUpperCase();
  const hasSentKot =
    status !== 'DRAFT' &&
    items.length > 0 &&
    ['PENDING', 'CONFIRMED', 'COMPLETED', 'PAID'].includes(status);

  return {
    items,
    hasSentKot,
    kotCartFingerprint: hasSentKot ? fingerprint : null,
    persistedTotals: mapOrderToCartTotals(order),
    appliedDiscount: mapOrderToAppliedDiscount(order),
  };
}
