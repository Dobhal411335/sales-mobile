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
  walking: 'direct-order-walk-in',
  staff: 'direct-order-staff',
} as const;
