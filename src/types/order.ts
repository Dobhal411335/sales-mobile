import type {ChoiceSelection} from './cart';
import type {TicketType} from './receipt';

export type ApiOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'PAID'
  | 'CANCELLED'
  | 'WAIVED'
  | 'Draft'
  | string;

export type ApiOrderSource = 'POS' | 'WALK_IN' | 'STAFF' | 'ONLINE' | string;

export interface ApiOrderItem {
  menuItemId?: string;
  cartId?: string;
  name: string;
  productCode?: string;
  category?: string;
  price: number;
  tax?: number;
  serviceCharge?: number;
  qty: number;
  size?: string;
  sizes?: string[];
  preparationStyle?: string | null;
  options?: string[];
  productType?: string;
  isOffer?: boolean;
  inclusions?: string[];
  choices?: string[];
  drinks?: string[];
  choiceSelections?: ChoiceSelection[];
  addonChoiceSelections?: ChoiceSelection[];
  sentQty?: number;
}

export interface ApiOrder {
  _id: string;
  orderNumber: string;
  invoiceNumber?: string;
  status: ApiOrderStatus;
  paymentStatus?: string;
  source?: ApiOrderSource;
  items: ApiOrderItem[];
  subTotal: number;
  taxTotal: number;
  discountTotal?: number;
  discountCode?: string | null;
  totalAmount: number;
  specialNote?: string;
  partyName?: string;
  guestName?: string;
  contactNumber?: string | null;
  guestCountryCode?: string | null;
  guestEmail?: string | null;
  guestCount?: number | null;
  tableSession?: string;
  tableNo?: string;
  floorName?: string;
  floorId?: string;
  processedByName?: string;
  createdAt?: string;
  staffFor?: string;
  staffOrderReason?: string;
}

export interface SubmitOrderApiResponse {
  _id: string;
  orderNumber: string;
  ticketType: TicketType;
  kotPayload: unknown[];
  items: ApiOrderItem[];
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  discountCode?: string;
  totalAmount: number;
  processedByName?: string;
  source?: string;
  tableNo?: string;
  guestCount?: number;
  floorName?: string;
  partyName?: string;
  guestName?: string;
  specialNote?: string;
  createdAt: string;
  status?: ApiOrderStatus;
  printJobId?: string | null;
}
