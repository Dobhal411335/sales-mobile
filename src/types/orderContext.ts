import type {OrderType} from '../navigation/types';

export type OrderSource = 'POS' | 'WALK_IN' | 'STAFF' | 'ONLINE';

export interface OrderContext {
  mobileOrderType: OrderType;
  source: OrderSource;
  sessionId?: string;
  tableId?: string;
  floorId?: string;
  floorName?: string;
  tableNumber?: string;
  guestCount?: number;
  orderId?: string;
  partyLabel: string;
  titleLabel: string;
}

export const DIRECT_ORDER_STORAGE_KEYS = {
  takeaway: 'direct-order-takeaway',
  staff: 'direct-order-staff',
} as const;

/** Legacy AsyncStorage key — clear/migrate when resuming takeaway orders. */
export const LEGACY_DIRECT_ORDER_WALK_IN_KEY = 'direct-order-walk-in';
