export type TodayOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'PAID'
  | 'CANCELLED'
  | 'WAIVED';

export type TodayOrderSource = 'POS' | 'WALK_IN' | 'STAFF' | 'ONLINE';

export type TodayOrderPaymentStatus = 'UNPAID' | 'PAID' | 'PARTIAL' | 'REFUNDED';

export type TodayOrderFilter =
  | 'All'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'WAIVED'
  | 'PAID'
  | 'ONLINE';

export interface TodayOrderItem {
  name: string;
  qty: number;
  price: number;
  size?: string;
  preparationStyle?: string;
  options?: string[];
}

export interface TodayOrderProcessedBy {
  name?: string;
  firstName?: string;
  lastName?: string;
}

export interface TodayOrderTableSession {
  _id?: string;
  id?: string;
}

export interface TodayOrder {
  _id: string;
  orderNumber: string;
  status: TodayOrderStatus;
  source?: TodayOrderSource;
  paymentStatus?: TodayOrderPaymentStatus;
  paymentMethod?: string;
  totalAmount: number;
  subTotal?: number;
  taxTotal?: number;
  discountTotal?: number;
  discountCode?: string;
  tipAmount?: number;
  giftcardUsedAmount?: number;
  giftcardCode?: string;
  tableNo?: string;
  floorName?: string;
  floor?: {name?: string};
  guestName?: string;
  partyName?: string;
  guestCount?: number;
  specialNote?: string;
  staffOrderReason?: string;
  waiveReason?: string;
  processedByName?: string;
  processedByRole?: string;
  processedBy?: TodayOrderProcessedBy | string;
  tableSession?: TodayOrderTableSession | string;
  items?: TodayOrderItem[];
  createdAt: string;
}

export interface TodayOrdersResponse {
  success: boolean;
  message?: string;
  data?: TodayOrder[];
}

export interface WaiveOrderResponse {
  success: boolean;
  message?: string;
  data?: TodayOrder & {sessionReleased?: boolean};
}

export interface TodaySalesMetric {
  key: string;
  label: string;
  short: string;
  value: string;
}
