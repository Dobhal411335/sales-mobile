import type {OrderType} from '../navigation/types';
import type {OrderContext, OrderSource} from '../types/orderContext';
import {DIRECT_ORDER_STORAGE_KEYS} from '../types/orderContext';
import {formatTableLocation} from './partyName';

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  table: 'Dine-in',
  takeaway: 'Takeaway Order',
  staff: 'Staff Order',
  online: 'Online Order',
};

export function mapMobileOrderTypeToSource(orderType?: OrderType): OrderSource {
  switch (orderType) {
    case 'takeaway':
      // API/DB still persist source as WALK_IN
      return 'WALK_IN';
    case 'staff':
      return 'STAFF';
    case 'online':
      return 'ONLINE';
    default:
      return 'POS';
  }
}

export function getDirectOrderStorageKey(orderType?: OrderType): string | null {
  if (orderType === 'takeaway') {
    return DIRECT_ORDER_STORAGE_KEYS.takeaway;
  }
  if (orderType === 'staff') {
    return DIRECT_ORDER_STORAGE_KEYS.staff;
  }
  return null;
}

export function buildBaseOrderContext(params: {
  orderType?: OrderType;
  tableId?: string;
  sessionId?: string;
}): OrderContext {
  const mobileOrderType = params.orderType ?? 'table';
  const source = mapMobileOrderTypeToSource(mobileOrderType);
  const titleLabel = ORDER_TYPE_LABELS[mobileOrderType];

  if (mobileOrderType === 'takeaway') {
    return {
      mobileOrderType,
      source,
      titleLabel,
      partyLabel: 'Takeaway Customer',
    };
  }

  if (mobileOrderType === 'staff') {
    return {
      mobileOrderType,
      source,
      titleLabel,
      partyLabel: 'Staff Order',
    };
  }

  if (mobileOrderType === 'online') {
    return {
      mobileOrderType,
      source,
      titleLabel,
      partyLabel: 'Online Order',
    };
  }

  return {
    mobileOrderType: 'table',
    source: 'POS',
    tableId: params.tableId,
    sessionId: params.sessionId,
    titleLabel: 'Dine-in',
    partyLabel: 'Create Order',
  };
}

export function enrichOrderContext(
  base: OrderContext,
  session?: {
    tableNumber?: string;
    floorName?: string;
    floorId?: string;
    guestCount?: number;
  },
): OrderContext {
  if (!session) {
    return base;
  }

  const tableLabel = formatTableLocation(
    session.tableNumber,
    session.floorName,
  );

  return {
    ...base,
    tableNumber: session.tableNumber,
    floorName: session.floorName,
    floorId: session.floorId,
    guestCount: session.guestCount,
    partyLabel: tableLabel || base.partyLabel,
  };
}

export function buildOrderHeaderTitle(
  context: OrderContext,
  orderNumber?: string | null,
): string {
  if (orderNumber) {
    return `Order #${orderNumber}`;
  }
  return context.titleLabel;
}
