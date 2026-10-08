export type ProductType = 'KITCHEN' | 'BAR';

export interface MenuCategory {
  id: string;
  name: string;
  status?: string;
}

export interface ProductVariant {
  size: string;
  price: number;
  status?: string;
}

export interface ChoiceOptionGroup {
  name: string;
  subChoices: string[];
}

export interface CustomDataOption {
  name: string;
  choices: string[];
}

export interface CustomDataGroup {
  name: string;
  subChoices: CustomDataOption[];
}

export interface ProductAddon {
  id?: string;
  name: string;
  price: number;
  size?: string;
  status?: string;
  choiceOptions?: ChoiceOptionGroup[];
}

export interface TaxRate {
  id?: string;
  name: string;
  type: string;
  value: number;
}

export interface MenuProduct {
  id: string;
  name: string;
  productCode?: string;
  productType?: ProductType;
  status?: string;
  category: MenuCategory;
  description?: string;
  price: number;
  variants?: ProductVariant[];
  addons?: ProductAddon[];
  customData?: CustomDataGroup[];
  choiceOptions?: ChoiceOptionGroup[];
  preparationStyles?: string[];
  taxes?: TaxRate[];
  taxData?: {
    totalPercentage?: number;
    totalFixed?: number;
    taxNames?: string[];
  };
  inStock?: boolean;
  isOffer?: boolean;
  imageUrl?: string;
  inclusions?: string[];
  choices?: string[];
  drinks?: string[];
}

export interface MenuOffer {
  id: string;
  name: string;
  price: number;
  inclusions?: string[];
  choices?: string[];
  drinks?: string[];
  taxes?: TaxRate[];
  taxData?: MenuProduct['taxData'];
  status?: string;
  imageUrl?: string;
}

export interface MenuHead {
  id: string;
  name: string;
  status?: string;
  imageUrl?: string;
}

export interface ProductHeadMapping {
  id: string;
  headName: string;
  status?: string;
  productIds: string[];
}

export type MenuViewMode = 'grid' | 'list';
export type PanelLayout = '2' | '3';
/** @deprecated List/cards view removed — products always render as tiles. */
export type ItemStyle = 'tiles';
export type GridCols = 2 | 3 | 4;

export function productNeedsOptions(product: MenuProduct): boolean {
  const hasVariants = Boolean(product.variants?.length);
  const hasAddons = Boolean(product.addons?.length);
  const hasStyles = Boolean(
    product.preparationStyles?.filter(Boolean).length,
  );
  const hasChoices = Boolean(
    product.choiceOptions?.some(
      (group) => group.name && group.subChoices?.length,
    ),
  );
  const hasCustomData = Boolean(
    product.customData?.some(
      (group) =>
        group.name &&
        group.subChoices?.some(
          (option) => option.name && option.choices?.length,
        ),
    ),
  );
  return hasVariants || hasAddons || hasStyles || hasChoices || hasCustomData;
}
