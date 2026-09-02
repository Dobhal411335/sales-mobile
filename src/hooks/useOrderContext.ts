import {useOrderStore} from '../store/orderStore';
import {buildOrderHeaderTitle} from '../utils/orderContextMapper';

export function useOrderContextDisplay(orderNumber?: string | null) {
  const orderContext = useOrderStore((state) => state.orderContext);

  if (!orderContext) {
    return {
      titleLabel: 'Create Order',
      partyLabel: 'Create Order',
      headerTitle: orderNumber ? `Order #${orderNumber}` : 'Create Order',
      guestCount: undefined,
      tableNumber: undefined,
      floorName: undefined,
      floorId: undefined,
    };
  }

  return {
    titleLabel: orderContext.titleLabel,
    partyLabel: orderContext.partyLabel,
    headerTitle: buildOrderHeaderTitle(orderContext, orderNumber),
    guestCount: orderContext.guestCount,
    tableNumber: orderContext.tableNumber,
    floorName: orderContext.floorName,
    floorId: orderContext.floorId,
    source: orderContext.source,
    mobileOrderType: orderContext.mobileOrderType,
  };
}
