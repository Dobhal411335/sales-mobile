import type {ChoiceOptionGroup, MenuProduct} from '../types/product';
import type {ChoiceSelection} from '../types/cart';

export function cleanChoiceList(list: unknown): string[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((value) => String(value).trim()).filter(Boolean);
}

export function normalizeChoiceOptions(
  list?: ChoiceOptionGroup[] | null,
): ChoiceOptionGroup[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((group) => ({
      name: String(group?.name || '').trim(),
      subChoices: cleanChoiceList(group?.subChoices),
    }))
    .filter((group) => group.name && group.subChoices.length > 0);
}

export function normalizeChoiceSelections(
  list?: ChoiceSelection[] | null,
): ChoiceSelection[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((group) => ({
      name: String(group?.name || '').trim(),
      subChoices: cleanChoiceList(group?.subChoices),
    }))
    .filter((group) => group.name && group.subChoices.length > 0);
}

export function productHasChoiceOptions(product?: MenuProduct | null): boolean {
  return normalizeChoiceOptions(product?.choiceOptions).length > 0;
}

export function cartChoiceSelectionsKey(selections?: ChoiceSelection[]): string {
  return JSON.stringify(
    normalizeChoiceSelections(selections).map((group) => ({
      name: group.name,
      subChoices: [...group.subChoices].sort(),
    })),
  );
}
