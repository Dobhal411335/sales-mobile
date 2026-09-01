import {useMemo} from 'react';
import type {OrderContext} from '../types/cart';
import type {OrderType} from '../navigation/types';
import {getMockSessionContext} from '../mocks/menuMockData';
import {formatTableLocation} from '../utils/partyName';

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  table: 'Table Order',
  walking: 'Walking Order',
  staff: 'Staff Order',
  online: 'Online Order',
};

interface UseOrderContextParams {
  orderType?: OrderType;
  tableId?: string;
  sessionId?: string;
}

export function useOrderContext({
  orderType,
  tableId,
  sessionId,
}: UseOrderContextParams): OrderContext {
  return useMemo(() => {
    const titleLabel = orderType
      ? ORDER_TYPE_LABELS[orderType]
      : 'Create Order';

    if (orderType === 'walking') {
      return {
        orderType,
        sessionId,
        titleLabel,
        partyLabel: 'Walk-in Customer',
      };
    }

    if (orderType === 'staff') {
      return {
        orderType,
        sessionId,
        titleLabel,
        partyLabel: 'Staff Order',
      };
    }

    if (orderType === 'online') {
      return {
        orderType,
        sessionId,
        titleLabel,
        partyLabel: 'Online Order',
      };
    }

    const session = getMockSessionContext(tableId);
    if (session) {
      const tableLabel = formatTableLocation(
        session.tableNumber,
        session.floorName,
      );
      return {
        orderType: orderType ?? 'table',
        tableId,
        sessionId,
        tableNumber: session.tableNumber,
        floorName: session.floorName,
        guestCount: session.guestCount,
        titleLabel: 'Table Order',
        partyLabel: tableLabel,
      };
    }

    return {
      orderType,
      tableId,
      sessionId,
      titleLabel,
      partyLabel: 'Create Order',
    };
  }, [orderType, tableId, sessionId]);
}
