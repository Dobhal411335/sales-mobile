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
  customDataSelections?: Array<{
    name: string;
    subChoices: string[];
  }>;
  addonChoiceSelections?: Array<{name: string; subChoices: string[]}>;
  customExtras?: Array<{name: string; price: number; qty?: number}>;
  modifier?: string;
  preparationStyle?: string;
  notes?: string;
  isOffer?: boolean;
  seatNumber?: number | null;
  seat?: string | number;
}

export interface TaxBreakdownLine {
  name: string;
  amount: number;
  rate?: number;
  taxId?: string;
}

export interface OrderPaymentSplit {
  name: string;
  amount: number;
  method: string;
  cardType?: string | null;
  tipAmount?: number;
  tipMethod?: string | null;
  cashAmount?: number | null;
  cardAmount?: number | null;
  giftcardUsedAmount?: number;
  paidAt?: string;
  seatNumber?: number | null;
  seatNumbers?: Array<number | null>;
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
  serverName?: string;
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
  paymentSplits?: OrderPaymentSplit[];
  taxBreakdown?: TaxBreakdownLine[];
  /** When true, receipt preview hides multi-seat headers (seat-scoped split slip) */
  filterReceiptBySeat?: boolean;
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
  /** Split slip metadata (Party / tender) when printing without fetching the job */
  jobMetadata?: Record<string, unknown> | null;
}
