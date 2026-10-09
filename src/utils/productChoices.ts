import type {ChoiceOptionGroup, MenuProduct, ProductAddon} from '../types/product';
import type {ChoiceSelection} from '../types/cart';

export function cleanChoiceList(list: unknown): string[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((value) => String(value).trim()).filter(Boolean);
}

/** Parse "Ranch ×3" / "Ranch x3" into { name, qty }. */
export function parseChoiceLabelWithQty(raw: unknown): {name: string; qty: number} {
  const text = String(raw || '').trim();
  if (!text) {
    return {name: '', qty: 0};
  }
  const match = text.match(/^(.*?)(?:\s*[×xX*]\s*(\d+))\s*$/);
  if (match && match[1] && match[2]) {
    return {
      name: String(match[1]).trim(),
      qty: Math.max(1, Math.floor(Number(match[2]) || 1)),
    };
  }
  return {name: text, qty: 1};
}

export function formatChoiceLabelWithQty(name: unknown, qty = 1): string {
  const label = String(name || '').trim();
  const count = Math.max(0, Math.floor(Number(qty) || 0));
  if (!label || count <= 0) {
    return '';
  }
  return count > 1 ? `${label} ×${count}` : label;
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

export function normalizeCustomData(
  list?: Array<{name?: string; subChoices?: string[]}> | null,
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

/** Cart / order selections: same shape; at most one option per group */
export function normalizeCustomDataSelections(
  list?: Array<{name?: string; subChoices?: string[]}> | null,
): ChoiceSelection[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((group) => ({
      name: String(group?.name || '').trim(),
      subChoices: cleanChoiceList(group?.subChoices).slice(0, 1),
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

export function cartCustomDataSelectionsKey(
  selections?: Array<{name?: string; subChoices?: string[]}>,
): string {
  return JSON.stringify(
    normalizeCustomDataSelections(selections).map((group) => ({
      name: group.name,
      subChoices: [...group.subChoices].sort(),
    })),
  );
}

/** Normalize nested addon choice qty map: { [subChoice]: qty }. Accepts legacy string[]. */
export function normalizeAddonChoiceQtyMap(
  raw: unknown,
): Record<string, number> {
  if (!raw) {
    return {};
  }
  if (Array.isArray(raw)) {
    const map: Record<string, number> = {};
    for (const value of cleanChoiceList(raw)) {
      const parsed = parseChoiceLabelWithQty(value);
      if (!parsed.name || parsed.qty <= 0) {
        continue;
      }
      map[parsed.name] = (Number(map[parsed.name]) || 0) + parsed.qty;
    }
    return map;
  }
  if (typeof raw !== 'object') {
    return {};
  }
  const map: Record<string, number> = {};
  for (const [name, qty] of Object.entries(raw as Record<string, unknown>)) {
    const label = String(name || '').trim();
    const count = Math.max(0, Math.floor(Number(qty) || 0));
    if (!label || count <= 0) {
      continue;
    }
    map[label] = count;
  }
  return map;
}

export function sumAddonChoiceQtyMap(raw: unknown): number {
  return Object.values(normalizeAddonChoiceQtyMap(raw)).reduce(
    (sum, qty) => sum + qty,
    0,
  );
}

/** Cart / KOT facing labels, e.g. ["Ranch ×3", "BBQ"]. */
export function formatAddonChoiceSubChoices(raw: unknown): string[] {
  return Object.entries(normalizeAddonChoiceQtyMap(raw))
    .map(([name, qty]) => formatChoiceLabelWithQty(name, qty))
    .filter(Boolean);
}

export function buildAddonChoiceSelectionsFromQtyMaps(
  addon: ProductAddon | null | undefined,
  choicesByGroup: Record<number, unknown> = {},
): ChoiceSelection[] {
  return normalizeChoiceOptions(addon?.choiceOptions)
    .map((group, index) => ({
      name: group.name,
      subChoices: formatAddonChoiceSubChoices(choicesByGroup[index]),
    }))
    .filter((group) => group.subChoices.length > 0);
}

/**
 * Validate nested addon choice groups against parent addon qty.
 * Each group total must equal addonQty when the addon has nested options.
 */
export function validateAddonNestedChoiceQtys(
  addon: ProductAddon | null | undefined,
  addonQty: number,
  choicesByGroup: Record<number, unknown> = {},
): {ok: boolean; errors: Array<{groupName: string; total: number; required: number; message: string}>} {
  const groups = normalizeChoiceOptions(addon?.choiceOptions);
  if (!groups.length || !(Number(addonQty) > 0)) {
    return {ok: true, errors: []};
  }
  const errors: Array<{
    groupName: string;
    total: number;
    required: number;
    message: string;
  }> = [];
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const total = sumAddonChoiceQtyMap(choicesByGroup[index]);
    const required = Math.max(0, Math.floor(Number(addonQty) || 0));
    if (total !== required) {
      errors.push({
        groupName: group.name,
        total,
        required,
        message:
          total > required
            ? `${group.name}: selected ${total}, but addon qty is only ${required}.`
            : `${group.name}: selected ${total}, must equal addon qty (${required}).`,
      });
    }
  }
  return {ok: errors.length === 0, errors};
}

export function isStyleOption(
  opt: unknown,
  preparationStyle?: string | null,
): boolean {
  const value = String(opt || '').trim();
  const lower = value.toLowerCase();
  if (lower.startsWith('style:')) {
    return true;
  }
  if (
    preparationStyle &&
    lower === String(preparationStyle).trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

export function isStandaloneExtraLine(item?: {
  size?: string | null;
} | null): boolean {
  return /^extra$/i.test(String(item?.size || ''));
}

/**
 * Standalone Extra lines store the addon name in both `name` and `options`
 * (options are required for pricing). Skip that label on tickets/cart UI.
 */
export function isRedundantStandaloneExtraOption(
  item:
    | {
        name?: string | null;
        size?: string | null;
      }
    | null
    | undefined,
  opt: unknown,
): boolean {
  if (!isStandaloneExtraLine(item)) return false;
  const itemName = String(item?.name || '').trim();
  if (!itemName) return false;
  const label = String(opt || '').trim();
  if (!label) return false;
  if (label.toLowerCase() === itemName.toLowerCase()) return true;
  const escaped = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^(?:addons|extras)\\s*:\\s*${escaped}$`, 'i').test(label);
}

/** Addon / extra labels stored on `item.options`, excluding preparation style. */
export function getItemExtraOptions(item?: {
  name?: string | null;
  size?: string | null;
  options?: string[] | null;
  preparationStyle?: string | null;
} | null): string[] {
  return (item?.options || []).filter((opt) => {
    if (isStyleOption(opt, item?.preparationStyle)) return false;
    if (isRedundantStandaloneExtraOption(item, opt)) return false;
    return true;
  });
}

export interface NormalizedCustomExtra {
  name: string;
  price: number;
  qty: number;
}

/** Max unit price allowed for a POS custom extra. */
export const MAX_CUSTOM_EXTRA_PRICE = 9999.99;

/** Max qty allowed for a single POS custom extra row. */
export const MAX_CUSTOM_EXTRA_QTY = 99;

/** Validate a custom-extra price for add flows (paid extras only). */
export function isValidCustomExtraPrice(price: unknown): boolean {
  const value = Number(price);
  return (
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_CUSTOM_EXTRA_PRICE
  );
}

/** Validate a custom-extra qty for add flows. */
export function isValidCustomExtraQty(qty: unknown): boolean {
  const value = Number(qty);
  return (
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_CUSTOM_EXTRA_QTY
  );
}

/** Normalize free-text POS custom extras: [{ name, price, qty }]. */
export function normalizeCustomExtras(list: unknown): NormalizedCustomExtra[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((entry) => {
      const raw = entry as {name?: unknown; price?: unknown; qty?: unknown};
      const name = String(raw?.name || '').trim();
      const price = Math.round((Number(raw?.price) || 0) * 100) / 100;
      const rawQty = Number(raw?.qty);
      const qty = Number.isFinite(rawQty)
        ? Math.min(MAX_CUSTOM_EXTRA_QTY, Math.max(1, Math.floor(rawQty)))
        : 1;
      return {name, price, qty};
    })
    .filter(
      (entry) =>
        entry.name &&
        entry.name.length <= 80 &&
        Number.isFinite(entry.price) &&
        entry.price > 0 &&
        entry.price <= MAX_CUSTOM_EXTRA_PRICE,
    );
}

/** Unit add-on total for one parent item: sum(price × qty). */
export function customExtrasUnitTotal(list: unknown): number {
  return normalizeCustomExtras(list).reduce(
    (sum, entry) => sum + entry.price * entry.qty,
    0,
  );
}

export function cartCustomExtrasKey(list: unknown): string {
  return JSON.stringify(normalizeCustomExtras(list));
}

/** Line total including nested custom extras (price × qty). */
export function getItemLineTotal(item?: {
  price?: number;
  qty?: number;
  customExtras?: unknown;
} | null): number {
  const qty = Math.max(0, Number(item?.qty) || 0);
  const unit =
    (Number(item?.price) || 0) + customExtrasUnitTotal(item?.customExtras);
  return unit * qty;
}
