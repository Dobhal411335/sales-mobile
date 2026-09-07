import type {PaidOrderSnapshot, TaxBreakdownLine} from '../types/receipt';

export type OrderType = 'table' | 'walking' | 'staff' | 'online';

export type AuthStackParamList = {
  Login: undefined;
};

export type SalesStackParamList = {
  Floor: undefined;
  CreateOrder:
    | {
        orderType?: OrderType;
        tableId?: string;
        sessionId?: string;
      }
    | undefined;
  Payment:
    | {
        sessionId?: string;
        orderId?: string;
        orderNumber?: string;
        orderType?: OrderType;
        tableId?: string;
        subtotal?: number;
        taxTotal?: number;
        total?: number;
        partyName?: string;
        guestCount?: number;
        tableNumber?: string;
        floorName?: string;
      }
    | undefined;
  Receipt: {
    orderSnapshot: PaidOrderSnapshot;
    sessionId?: string;
    orderType?: OrderType;
    tableId?: string;
    taxBreakdown?: TaxBreakdownLine[];
    printJobId?: string | null;
  };
  Orders: {filter?: 'ONLINE' | 'ALL'} | undefined;
  TodaySales: undefined;
  Reports: undefined;
  Notifications: undefined;
  PrintJobs: {jobId?: string} | undefined;
  DayClose: undefined;
};
