export interface DayClosePendingOrder {
  id: string;
  orderNumber: string;
  status: string;
  tableNo?: string | null;
  source?: string | null;
  partyName?: string | null;
}

export interface DayCloseBookedTable {
  sessionId: string;
  tableNumber: string;
  employeeName?: string;
  status?: string;
  guestCount?: number;
}

export interface DayCloseBlockers {
  pendingOrders: DayClosePendingOrder[];
  bookedTables: DayCloseBookedTable[];
  pendingOrderCount: number;
  bookedTableCount: number;
  canClose: boolean;
}

export interface DayCloseValidationResponse {
  success: boolean;
  message?: string;
  data?: DayCloseBlockers;
}

export interface DayCloseResultResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    expiredSessionCount?: number;
  } & DayCloseBlockers;
}
