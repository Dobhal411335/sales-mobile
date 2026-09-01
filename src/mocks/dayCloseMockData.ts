import type {DayCloseBlockers} from '../types/dayClose';

/**
 * Toggle for local UI development when API_BASE_URL is not configured.
 * - blocked: shows pending orders + booked tables (default)
 * - ready: shows ready-to-close state
 */
export type MockDayCloseScenario = 'blocked' | 'ready';

export const MOCK_DAY_CLOSE_SCENARIO: MockDayCloseScenario = 'blocked';

export function getMockDayCloseBlockers(
  scenario: MockDayCloseScenario = MOCK_DAY_CLOSE_SCENARIO,
): DayCloseBlockers {
  if (scenario === 'ready') {
    return {
      pendingOrders: [],
      bookedTables: [],
      pendingOrderCount: 0,
      bookedTableCount: 0,
      canClose: true,
    };
  }

  return {
    pendingOrders: [
      {
        id: 'order-0163',
        orderNumber: '0163',
        status: 'PENDING',
        tableNo: 'Table 03',
        source: 'TABLE',
        partyName: null,
      },
      {
        id: 'order-0160',
        orderNumber: '0160',
        status: 'PENDING',
        tableNo: 'Table 01',
        source: 'TABLE',
        partyName: null,
      },
    ],
    bookedTables: [
      {
        sessionId: 'session-01',
        tableNumber: '01',
        employeeName: 'Akhil Maratha',
        status: 'BOOKED',
        guestCount: 6,
      },
      {
        sessionId: 'session-02',
        tableNumber: '02',
        employeeName: 'Admin User',
        status: 'BOOKED',
        guestCount: 6,
      },
      {
        sessionId: 'session-03',
        tableNumber: '03',
        employeeName: 'Akhil Maratha',
        status: 'BOOKED',
        guestCount: 6,
      },
    ],
    pendingOrderCount: 2,
    bookedTableCount: 3,
    canClose: false,
  };
}
