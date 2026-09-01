import type {OrderType} from '../navigation/types';
import type {ProductType, TaxRate} from './product';

export interface ChoiceSelection {
  name: string;
  subChoices: string[];
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
  modifier?: string;
  taxes?: TaxRate[];
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

export interface OrderContext {
  orderType?: OrderType;
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
  floorName?: string;
  guestCount?: number;
  orderNumber?: string;
  partyLabel: string;
  titleLabel: string;
}
