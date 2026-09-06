import type {CartLineItem} from './cart';

export type TicketType = 'KOT' | 'BAR_RECEIPT';

export type ReceiptMode = 'kot' | 'bar' | 'customer';

export interface KotLineItem {
  name: string;
  qty: number;
  productCode?: string;
  category?: string;
  size?: string;
  course?: string;
  options?: string[];
  choices?: string[];
  drinks?: string[];
  choiceSelections?: Array<{name: string; subChoices: string[]}>;
  addonChoiceSelections?: Array<{name: string; subChoices: string[]}>;
  modifier?: string;
  isOffer?: boolean;
}

export interface TaxBreakdownLine {
  name: string;
  amount: number;
  rate?: number;
  taxId?: string;
}

export interface ReceiptOrder {
  orderNumber: string;
  invoiceNumber?: string;
  orderId?: string;
  tableNo?: string;
  floorName?: string;
  guestName?: string;
  partyName?: string;
  guestCount?: number;
  createdAt?: string;
  specialNote?: string;
  items?: CartLineItem[];
  subTotal?: number;
  taxTotal?: number;
  discountTotal?: number;
  discountPercent?: number | null;
  discountCode?: string;
  giftcardUsedAmount?: number;
  totalAmount?: number;
  tipAmount?: number;
  tipMethod?: string;
  serviceChargeTotal?: number;
  serviceChargeName?: string;
  paymentMethod?: string;
  cashAmount?: number;
  cardAmount?: number;
  paymentStatus?: string;
  source?: string;
  isReprint?: boolean;
  restaurantName?: string;
}

export interface PaidOrderSnapshot extends ReceiptOrder {
  paidAt: string;
  cardType?: string;
  taxBreakdown?: TaxBreakdownLine[];
}

export interface KotPrintPayload {
  order: ReceiptOrder;
  kotItems: KotLineItem[];
  ticketType: TicketType;
  serverName?: string;
  guestCount?: number;
  specialNote?: string;
  isReprint?: boolean;
}

export interface BillPrintPayload {
  order: PaidOrderSnapshot;
  taxBreakdown?: TaxBreakdownLine[];
  serverName?: string;
  guestCount?: number;
  restaurantName?: string;
  isReprint?: boolean;
}
