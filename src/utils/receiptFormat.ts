import type {CartLineItem} from '../types/cart';
import type {KotLineItem} from '../types/receipt';
import {isOfferItem, getOfferDetailLines} from './offerDetails';
import {
  getItemExtraOptions,
  normalizeChoiceSelections,
  normalizeCustomExtras,
} from './productChoices';

export function formatReceiptDate(dateInput?: string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTableNumbersWithFloor(
  tableNo?: string,
  floorName?: string,
): string {
  let table = (tableNo ?? '').trim();
  table = table.replace(/^(tables?\s*)+/i, '').trim();
  const floor = (floorName ?? '').trim();
  if (table && floor) {
    if (table.toLowerCase().includes(floor.toLowerCase())) {
      return table;
    }
    return `${table} · ${floor}`;
  }
  if (table) {
    return table;
  }
  if (floor) {
    return floor;
  }
  return '';
}

/**
 * Kitchen + customer tickets share this so extras, addons, and choices
 * print the same way on both.
 * Nested addon qtys (e.g. "Hot Sauce ×3") are listed per sub-choice for chefs.
 */
export function getReceiptModifierLines(
  item: KotLineItem | CartLineItem,
): Array<{kind: string; text: string; price?: number}> {
  const lines: Array<{kind: string; text: string; price?: number}> = [];

  const style = String(item.preparationStyle || '').trim();
  if (style) {
    lines.push({kind: 'style', text: `+ ${style}`});
  }

  if (isOfferItem(item)) {
    for (const line of getOfferDetailLines(item)) {
      lines.push({kind: 'offer', text: `${line.label}: ${line.value}`});
    }
    return lines;
  }

  for (const group of normalizeChoiceSelections(item.choiceSelections)) {
    lines.push({kind: 'choice', text: `${group.name}:`});
    for (const sub of group.subChoices) {
      lines.push({kind: 'choice-item', text: `• ${sub}`});
    }
  }

  for (const group of normalizeChoiceSelections(item.addonChoiceSelections)) {
    lines.push({kind: 'addon-choice', text: `${group.name}:`});
    for (const sub of group.subChoices) {
      lines.push({kind: 'addon-choice-item', text: `• ${sub}`});
    }
  }

  for (const opt of getItemExtraOptions(item)) {
    const label = String(opt || '').trim();
    if (label) {
      lines.push({kind: 'extra', text: `+ ${label}`});
    }
  }

  for (const extra of normalizeCustomExtras(
    (item as CartLineItem).customExtras,
  )) {
    lines.push({
      kind: 'custom-extra',
      text: `+ ${extra.name}`,
      price: extra.price,
    });
  }

  // Legacy fallback when structured selections are missing
  if (
    lines.length === (style ? 1 : 0) &&
    !item.choiceSelections?.length &&
    !item.addonChoiceSelections?.length
  ) {
    if (item.modifier) {
      lines.push({kind: 'modifier', text: String(item.modifier)});
    }
    if (item.choices?.length) {
      item.choices.forEach((choice) => {
        lines.push({kind: 'choice', text: choice});
      });
    }
    if (item.drinks?.length) {
      item.drinks.forEach((drink) => {
        lines.push({kind: 'drink', text: drink});
      });
    }
  }

  return lines;
}

export function cartLineToKotItem(line: CartLineItem): KotLineItem {
  const notes = String(line.notes || '').trim();
  const rawSeat = Number(line.seatNumber);
  const seatNumber =
    Number.isFinite(rawSeat) && rawSeat >= 1 ? Math.floor(rawSeat) : null;
  return {
    name: line.name,
    qty: line.qty,
    productCode: line.productCode,
    category: line.category,
    size: line.size,
    options: line.options,
    choices: line.choices,
    drinks: line.drinks,
    choiceSelections: line.choiceSelections,
    addonChoiceSelections: line.addonChoiceSelections,
    customExtras: normalizeCustomExtras(line.customExtras),
    modifier: line.modifier,
    preparationStyle: line.preparationStyle || undefined,
    notes: notes || undefined,
    isOffer: line.isOffer,
    seatNumber,
    ...(seatNumber != null
      ? {seat: seatNumber}
      : line.seatNumber === null
        ? {seat: 'Table', seatNumber: null}
        : {}),
  };
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}
