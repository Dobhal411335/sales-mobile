import type {ProductType, TaxRate} from './product';

export interface ChoiceSelection {
  name: string;
  subChoices: string[];
}

export interface CustomExtra {
  name: string;
  price: number;
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
  addonChoiceSelections?: ChoiceSelection[];
  /** Free-text extras from POS (name + price). */
  customExtras?: CustomExtra[];
  modifier?: string;
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
