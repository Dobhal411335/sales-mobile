/**
 * Development placeholder data for EOD report UI.
 * Used when API_BASE_URL is not configured. Replace via eodService live switch.
 */
import type {EodHistoryRow, EodReport} from '../types/eod';
import {todayLocalISO} from '../utils/eodFormat';

function priorDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const py = date.getFullYear();
  const pm = String(date.getMonth() + 1).padStart(2, '0');
  const pd = String(date.getDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

export function buildMockEodReport(businessDate: string): EodReport {
  const prior = priorDate(businessDate);
  const isToday = businessDate === todayLocalISO();

  return {
    meta: {
      restaurantName: 'Tasty Bites',
      restaurantEmail: 'manager@tastybites.example',
      restaurantPhone: '(555) 123-4567',
      restaurantAddress: '123 Main Street',
      businessDate,
      priorDate: prior,
      title: `Tasty Bites - End Of Day - ${businessDate}/${prior}`,
      generatedAt: new Date().toISOString(),
      generatedBy: null,
      generatedByName: isToday ? 'Demo Employee' : 'System',
      source: isToday ? 'live' : 'saved',
    },
    summary: {
      netSales: 1248.5,
      orders: 18,
      taxes: 99.88,
      tips: 187.25,
      serviceCharges: 0,
      cash: 412.0,
      card: 836.5,
      giftCard: 0,
      refunds: 0,
      totalPayment: 1535.63,
    },
    reconciliation: {
      ok: true,
      messages: [],
      expectedPaymentTotal: 1535.63,
      actualPaymentTotal: 1535.63,
      difference: 0,
    },
    orderCounts: {
      total: 18,
      paid: 16,
      pending: 1,
      confirmed: 1,
      open: 2,
      completed: 16,
      cancelled: 0,
      cancelledAmount: 0,
      waived: 0,
      waivedAmount: 0,
      refunded: 0,
      refundedNote: 'Refunds are not yet tracked in POS.',
    },
    detailedSalesSummary: {
      netSales: 1248.5,
      grossSales: 1312.0,
      totalDiscounts: 63.5,
      menuItemCost: 0,
      laborCost: 320.0,
      grossMargin: 928.5,
      totalSalesTaxes: 99.88,
      totalServiceCharges: 0,
      averagePerGuest: 41.62,
      averagePerBill: 69.36,
      totalRefundAmount: 0,
    },
    detailedLaborSummary: {
      totalLaborCost: 320.0,
      totalLaborHours: 28.5,
      laborCostPctOfNetSales: 25.63,
      averageTableTurnTimeMinutes: 52,
      totalNonCashTips: 142.25,
      totalCashTips: 45.0,
      totalTips: 187.25,
      totalGratuity: 0,
      totalActiveShifts: 2,
      totalCompletedShifts: 4,
    },
    paymentsSummary: {
      transactionsCount: 16,
      refundsCount: 0,
      totalCash: 412.0,
      totalNonCash: 836.5,
      totalSurcharges: 0,
      totalPayment: 1535.63,
      totalPaymentsMinusNetSales: 287.13,
      totalCashRounding: 0,
    },
    salesBySection: {
      rows: [
        {
          sectionName: 'Main Hall',
          billCount: 12,
          netSales: 842.5,
          grossSales: 880.0,
          discounts: 37.5,
          taxes: 67.4,
        },
        {
          sectionName: 'Bar',
          billCount: 6,
          netSales: 406.0,
          grossSales: 432.0,
          discounts: 26.0,
          taxes: 32.48,
        },
      ],
      total: {
        sectionName: 'TOTAL',
        billCount: 18,
        netSales: 1248.5,
        grossSales: 1312.0,
        discounts: 63.5,
        taxes: 99.88,
      },
    },
    salesBySalesCategory: {
      rows: [
        {
          salesCategory: 'Food',
          menuItemQuantity: 42,
          netSales: 892.0,
          grossSales: 940.0,
          discounts: 48.0,
          taxes: 71.36,
        },
        {
          salesCategory: 'Beverage',
          menuItemQuantity: 28,
          netSales: 356.5,
          grossSales: 372.0,
          discounts: 15.5,
          taxes: 28.52,
        },
      ],
      total: {
        salesCategory: 'TOTAL',
        menuItemQuantity: 70,
        netSales: 1248.5,
        grossSales: 1312.0,
        discounts: 63.5,
        taxes: 99.88,
      },
    },
    giftCardSales: {
      rows: [
        {item: 'Issued (not POS revenue)', count: 0, total: 0},
        {item: 'Redeemed as payment', count: 0, total: 0},
      ],
      total: {item: 'ISSUED TOTAL', count: 0, total: 0},
      note: 'Gift card issuance is tracked separately from net sales.',
    },
    tipsByEmployees: {
      rows: [
        {
          employeeName: 'Smith, Jane',
          cashTips: 28.0,
          nonCashTips: 86.5,
          totalTips: 114.5,
        },
        {
          employeeName: 'Demo Employee',
          cashTips: 17.0,
          nonCashTips: 55.75,
          totalTips: 72.75,
        },
      ],
      total: {
        employeeName: 'TOTAL',
        cashTips: 45.0,
        nonCashTips: 142.25,
        totalTips: 187.25,
      },
    },
    tipsSummary: {
      totalCashTips: 45.0,
      totalNonCashTips: 142.25,
      totalTips: 187.25,
    },
    paymentByPaymentType: {
      rows: [
        {
          paymentType: 'Cash',
          paymentCount: 6,
          refunds: 0,
          tips: 45.0,
          paymentTotal: 457.0,
        },
        {
          paymentType: 'Credit Visa',
          paymentCount: 8,
          refunds: 0,
          tips: 112.25,
          paymentTotal: 948.75,
        },
        {
          paymentType: 'Credit Mastercard',
          paymentCount: 2,
          refunds: 0,
          tips: 30.0,
          paymentTotal: 129.88,
        },
      ],
      total: {
        paymentType: 'TOTAL',
        paymentCount: 16,
        refunds: 0,
        tips: 187.25,
        paymentTotal: 1535.63,
      },
    },
    accounts: {rows: []},
    tipOuts: {totalCashOwedToHouse: 0, totalCashOwedToServer: 0},
    payouts: {totalPayouts: 0},
    payins: {totalPayins: 0},
    salesTaxAndTipSummary: {
      netSales: 1248.5,
      grossSales: 1312.0,
      totalDiscounts: 63.5,
      totalSalesTaxes: 99.88,
      totalTips: 187.25,
      totalNetSalesTaxesAndTips: 1535.63,
      serviceCharges: 0,
      gratuities: 0,
      surcharges: 0,
      otherServiceCharges: 0,
      serviceChargesTaxes: 0,
      totalRefundsAmount: 0,
      totalVoids: 0,
      totalBillCount: 18,
      totalGuestCount: 30,
      giftCardSales: 0,
      grossMargin: 928.5,
      billsWithOutstandingBalance: 0,
    },
    cashDeposit: {
      businessDay: businessDate,
      expectedDeposit: 412.0,
      actualDeposit: 0,
      overShort: -412.0,
      createdBy: '—',
      openingCashAvailable: false,
      physicalTillCountAvailable: false,
      note: 'Enter actual deposit before saving the report.',
    },
    taxSummary: {
      rows: [
        {
          taxName: 'Sales Tax',
          billCount: 16,
          taxAmount: 99.88,
          netSales: 1248.5,
        },
      ],
      total: {
        taxName: 'TOTAL',
        billCount: '',
        taxAmount: 99.88,
        netSales: '',
      },
    },
  };
}

export const MOCK_EOD_HISTORY: EodHistoryRow[] = [
  {
    id: 'mock-1',
    businessDate: priorDate(todayLocalISO()),
    status: 'SAVED',
    generatedAt: new Date(Date.now() - 86400000).toISOString(),
    generatedByName: 'Demo Employee',
    netSales: 982.25,
    totalPayment: 1188.4,
    expectedDeposit: 310.0,
    actualDeposit: 308.5,
    overShort: -1.5,
    reconciliationOk: true,
  },
];
