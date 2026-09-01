export interface EodSummary {
  netSales: number;
  orders: number;
  taxes: number;
  tips: number;
  serviceCharges: number;
  cash: number;
  card: number;
  giftCard: number;
  refunds?: number;
  totalPayment?: number;
}

export interface EodReconciliation {
  ok: boolean;
  messages: string[];
  expectedPaymentTotal: number;
  actualPaymentTotal: number;
  difference: number;
}

export interface EodMeta {
  restaurantName: string;
  restaurantEmail: string;
  restaurantPhone: string;
  restaurantAddress: string;
  businessDate: string;
  priorDate: string;
  title: string;
  generatedAt: string;
  generatedBy: string | null;
  generatedByName: string | null;
  source: 'live' | 'saved';
  savedAt?: string;
  savedId?: string;
}

export interface EodOrderCounts {
  total: number;
  paid: number;
  pending: number;
  confirmed: number;
  open: number;
  completed: number;
  cancelled: number;
  cancelledAmount: number;
  waived: number;
  waivedAmount: number;
  refunded: number;
  refundedNote?: string;
}

export interface EodDetailedSalesSummary {
  netSales: number;
  grossSales: number;
  totalDiscounts: number;
  menuItemCost: number;
  laborCost: number;
  grossMargin: number;
  totalSalesTaxes: number;
  totalServiceCharges: number;
  averagePerGuest: number;
  averagePerBill: number;
  totalRefundAmount: number;
}

export interface EodDetailedLaborSummary {
  totalLaborCost: number;
  totalLaborHours: number;
  laborCostPctOfNetSales: number;
  averageTableTurnTimeMinutes: number;
  totalNonCashTips: number;
  totalCashTips: number;
  totalTips: number;
  totalGratuity: number;
  totalActiveShifts: number;
  totalCompletedShifts: number;
}

export interface EodPaymentsSummary {
  transactionsCount: number;
  refundsCount: number;
  totalCash: number;
  totalNonCash: number;
  totalSurcharges: number;
  totalPayment: number;
  totalPaymentsMinusNetSales: number;
  totalCashRounding: number;
}

export interface EodSalesBySectionRow {
  sectionName: string;
  billCount: number;
  netSales: number;
  grossSales: number;
  discounts: number;
  taxes: number;
}

export interface EodSalesByCategoryRow {
  salesCategory: string;
  menuItemQuantity: number;
  netSales: number;
  grossSales: number;
  discounts: number;
  taxes: number;
}

export interface EodGiftCardRow {
  item: string;
  count: number;
  total: number;
}

export interface EodTipsByEmployeeRow {
  employeeName: string;
  cashTips: number;
  nonCashTips: number;
  totalTips: number;
}

export interface EodPaymentByTypeRow {
  paymentType: string;
  paymentCount: number;
  refunds: number;
  tips: number;
  paymentTotal: number;
}

export interface EodTaxSummaryRow {
  taxName: string;
  billCount: number | string;
  taxAmount: number;
  netSales: number | string;
}

export interface EodCashDeposit {
  businessDay: string;
  expectedDeposit: number;
  actualDeposit: number;
  overShort: number;
  createdBy: string;
  openingCashAvailable: boolean;
  physicalTillCountAvailable: boolean;
  note: string;
}

export interface EodReport {
  meta: EodMeta;
  summary: EodSummary;
  reconciliation: EodReconciliation;
  orderCounts: EodOrderCounts;
  detailedSalesSummary: EodDetailedSalesSummary;
  detailedLaborSummary: EodDetailedLaborSummary;
  paymentsSummary: EodPaymentsSummary;
  salesBySection: {
    rows: EodSalesBySectionRow[];
    total: EodSalesBySectionRow;
  };
  salesBySalesCategory: {
    rows: EodSalesByCategoryRow[];
    total: EodSalesByCategoryRow;
  };
  giftCardSales: {
    rows: EodGiftCardRow[];
    total: EodGiftCardRow;
    note?: string;
  };
  tipsByEmployees: {
    rows: EodTipsByEmployeeRow[];
    total: EodTipsByEmployeeRow;
  };
  tipsSummary: {
    totalCashTips: number;
    totalNonCashTips: number;
    totalTips: number;
  };
  paymentByPaymentType: {
    rows: EodPaymentByTypeRow[];
    total: EodPaymentByTypeRow;
  };
  accounts: {
    rows: Array<{
      accountName: string;
      payments: number;
      deposits: number;
    }>;
  };
  tipOuts: {
    totalCashOwedToHouse: number;
    totalCashOwedToServer: number;
  };
  payouts: {totalPayouts: number};
  payins: {totalPayins: number};
  salesTaxAndTipSummary: {
    netSales: number;
    grossSales: number;
    totalDiscounts: number;
    totalSalesTaxes: number;
    totalTips: number;
    totalNetSalesTaxesAndTips: number;
    serviceCharges: number;
    gratuities: number;
    surcharges: number;
    otherServiceCharges: number;
    serviceChargesTaxes: number;
    totalRefundsAmount: number;
    totalVoids: number;
    totalBillCount: number;
    totalGuestCount: number;
    giftCardSales: number;
    grossMargin: number;
    billsWithOutstandingBalance: number;
  };
  cashDeposit: EodCashDeposit;
  taxSummary: {
    rows: EodTaxSummaryRow[];
    total: EodTaxSummaryRow;
  };
}

export interface EodHistoryRow {
  id: string;
  businessDate: string;
  status: string;
  generatedAt: string;
  generatedByName: string | null;
  netSales: number | null;
  totalPayment: number | null;
  expectedDeposit: number | null;
  actualDeposit: number | null;
  overShort: number | null;
  reconciliationOk: boolean;
}

export interface EodReportResponse {
  success: boolean;
  message?: string;
  data?: {
    report: EodReport;
    saved: boolean;
    businessDate: string;
  };
}

export interface EodSaveResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    businessDate: string;
    report: EodReport;
    reconciliation: EodReconciliation;
  };
}

export interface EodHistoryResponse {
  success: boolean;
  message?: string;
  data?: {
    history: EodHistoryRow[];
  };
}

export interface EodEmailResponse {
  success: boolean;
  message?: string;
  data?: {
    to: string;
    businessDate: string;
  };
}

export type EodExportKind = 'excel' | 'pdf';

export type EodActionFeedback = {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
} | null;
