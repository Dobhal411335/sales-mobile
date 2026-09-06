import type {CartLineItem, ChoiceSelection} from '../types/cart';
import type {KotLineItem} from '../types/receipt';

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

export function getReceiptModifierLines(
  item: KotLineItem | CartLineItem,
): Array<{kind: string; text: string}> {
  const lines: Array<{kind: string; text: string}> = [];

  if (item.modifier) {
    lines.push({kind: 'modifier', text: item.modifier});
  }

  if (item.options?.length) {
    item.options.forEach((opt) => {
      lines.push({kind: 'option', text: opt});
    });
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

  const choiceSelections = item.choiceSelections ?? [];
  choiceSelections.forEach((selection: ChoiceSelection) => {
    if (selection.subChoices?.length) {
      lines.push({
        kind: 'choice',
        text: `${selection.name}: ${selection.subChoices.join(', ')}`,
      });
    }
  });

  const addonSelections = item.addonChoiceSelections ?? [];
  addonSelections.forEach((selection: ChoiceSelection) => {
    if (selection.subChoices?.length) {
      lines.push({
        kind: 'addon',
        text: `${selection.name}: ${selection.subChoices.join(', ')}`,
      });
    }
  });

  return lines;
}

export function cartLineToKotItem(line: CartLineItem): KotLineItem {
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
    modifier: line.modifier,
    isOffer: line.isOffer,
  };
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}
