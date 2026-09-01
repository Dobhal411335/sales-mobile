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
  choiceOptions?: ChoiceOptionGroup[];
  preparationStyles?: string[];
  taxes?: TaxRate[];
  taxData?: {
    totalPercentage?: number;
    totalFixed?: number;
    taxNames?: string[];
  };
  inStock?: boolean;
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
}

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
  return hasVariants || hasAddons || hasStyles || hasChoices;
}
