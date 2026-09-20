import type {PaidOrderSnapshot, TaxBreakdownLine} from '../types/receipt';

export type OrderType = 'table' | 'walking' | 'staff' | 'online';

export type AuthStackParamList = {
  Login: undefined;
};

export type SalesStackParamList = {
  Floor: undefined;
  WalkInHub: undefined;
  StaffHub: undefined;
  CreateOrder:
    | {
        orderType?: OrderType;
        tableId?: string;
        sessionId?: string;
        orderId?: string;
        staffId?: string;
        fresh?: boolean;
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
        /** Seed from Orders list so payment works even if orderId GET lags/excludes ONLINE */
        paymentSeed?: {
          source?: string;
          status?: string;
          paymentStatus?: string;
          specialNote?: string;
          guestName?: string;
          partyName?: string;
          contactNumber?: string;
          guestCountryCode?: string;
          guestEmail?: string;
          discountTotal?: number;
          discountCode?: string;
          processedByName?: string;
          onlineKotSentAt?: string;
          items?: Array<{
            name: string;
            qty: number;
            price: number;
            size?: string;
            preparationStyle?: string;
            options?: string[];
            productType?: string;
            category?: string;
          }>;
        };
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
  Booking: undefined;
  TodaySales: undefined;
  Reports: undefined;
  Notifications: undefined;
  PrintJobs: {jobId?: string} | undefined;
  PrintersSettings: undefined;
  DayClose: undefined;
};
