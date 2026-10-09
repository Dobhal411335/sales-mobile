import type {ProductType, TaxRate} from './product';

export interface ChoiceSelection {
  name: string;
  subChoices: string[];
}

export interface CustomDataSelection {
  name: string;
  subChoices: string[];
}

export interface CustomExtra {
  name: string;
  price: number;
  qty?: number;
}

export interface CartLineItem {
  cartId: string;
  id: string;
  name: string;
  productCode?: string;
  category: string;
  price: number;
  tax: number;
  serviceCharge?: number;
  qty: number;
  size?: string;
  sizes?: string[];
  preparationStyle?: string | null;
  options?: string[];
  productType?: ProductType;
  isOffer?: boolean;
  inclusions?: string[];
  choices?: string[];
  drinks?: string[];
  choiceSelections?: ChoiceSelection[];
  customDataSelections?: CustomDataSelection[];
  addonChoiceSelections?: ChoiceSelection[];
  /** Free-text extras from POS (name + unit price × qty). */
  customExtras?: CustomExtra[];
  modifier?: string;
  /** Cart "Without" field — combined into `notes` for kitchen. */
  noteWithout?: string;
  /** Cart "Add" field — combined into `notes` for kitchen. */
  noteAdd?: string;
  notes?: string;
  taxes?: TaxRate[];
  /** 1-based seat; null/undefined = shared Table bucket */
  seatNumber?: number | null;
}

export interface CartTotals {
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
}

export interface AppliedDiscount {
  code?: string;
  type: 'percent' | 'fixed';
  value: number;
}

export type OrderStatus = 'DRAFT' | 'PENDING' | 'PAID' | string;
