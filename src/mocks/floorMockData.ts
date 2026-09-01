/**
 * Development-only mock floor data.
 * Replace with floorService → GET /api/sales/floor in a later integration phase.
 */
import type {FloorData} from '../types/table';

const MOCK_EMPLOYEE_ID = 'mock-employee';
const OTHER_EMPLOYEE_ID = 'other-employee';

const MAIN_HALL_FLOOR_ID = 'floor-main-hall';
const OUTDOOR_FLOOR_ID = 'floor-outdoor';

const mainHallTables = [
  {id: 't01', tableNumber: '01', x: 60, y: 140, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 6},
  {id: 't02', tableNumber: '02', x: 60, y: 280, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 4},
  {id: 't03', tableNumber: '03', x: 60, y: 420, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 6},
  {id: 't04', tableNumber: '04', x: 60, y: 560, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 4},
  {id: 't05', tableNumber: '05', x: 60, y: 700, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 2},
  {id: 't12', tableNumber: '12', x: 380, y: 80, width: 110, height: 110, rotation: 0, shape: 'round' as const, seats: 8},
  {id: 't06', tableNumber: '06', x: 420, y: 280, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 4},
  {id: 't07', tableNumber: '07', x: 560, y: 280, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 4},
  {id: 't08', tableNumber: '08', x: 420, y: 420, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 6},
  {id: 't09', tableNumber: '09', x: 560, y: 420, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 6},
  {id: 't10', tableNumber: '10', x: 780, y: 200, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 4},
  {id: 't11', tableNumber: '11', x: 780, y: 360, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 4},
];

const outdoorTables = [
  {id: 'o01', tableNumber: 'O1', x: 120, y: 160, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 4},
  {id: 'o02', tableNumber: 'O2', x: 280, y: 160, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 4},
  {id: 'o03', tableNumber: 'O3', x: 440, y: 160, width: 100, height: 100, rotation: 0, shape: 'square' as const, seats: 6},
];

const mainHallSessions = [
  {
    id: 'session-ordering',
    sessionId: 'S-1001',
    tableId: 't03',
    linkedTableIds: [],
    assignedEmployeeId: MOCK_EMPLOYEE_ID,
    assignedEmployeeName: 'Akhil Sharma',
    guestCount: 6,
    effectiveSeatCount: 6,
    status: 'ACTIVE',
    hasActiveOrder: true,
  },
  {
    id: 'session-serving',
    sessionId: 'S-1002',
    tableId: 't06',
    linkedTableIds: [],
    assignedEmployeeId: MOCK_EMPLOYEE_ID,
    assignedEmployeeName: 'Akhil Sharma',
    guestCount: 3,
    effectiveSeatCount: 4,
    status: 'ACTIVE',
    hasActiveOrder: false,
  },
  {
    id: 'session-payment',
    sessionId: 'S-1003',
    tableId: 't08',
    linkedTableIds: [],
    assignedEmployeeId: MOCK_EMPLOYEE_ID,
    assignedEmployeeName: 'Akhil Sharma',
    guestCount: 4,
    effectiveSeatCount: 6,
    status: 'PAYMENT_PENDING',
    hasActiveOrder: true,
  },
  {
    id: 'session-combined',
    sessionId: 'S-1004',
    tableId: 't09',
    linkedTableIds: ['t07'],
    assignedEmployeeId: MOCK_EMPLOYEE_ID,
    assignedEmployeeName: 'Akhil Sharma',
    guestCount: 8,
    effectiveSeatCount: 10,
    status: 'ACTIVE',
    hasActiveOrder: true,
  },
  {
    id: 'session-booked',
    sessionId: 'S-1005',
    tableId: 't10',
    linkedTableIds: [],
    assignedEmployeeId: OTHER_EMPLOYEE_ID,
    assignedEmployeeName: 'Priya Patel',
    guestCount: 2,
    effectiveSeatCount: 4,
    status: 'ACTIVE',
    hasActiveOrder: false,
  },
];

const floorDataById: Record<string, FloorData> = {
  [MAIN_HALL_FLOOR_ID]: {
    floors: [
      {id: MAIN_HALL_FLOOR_ID, name: 'Main Hall Area', width: 1200, height: 900},
      {id: OUTDOOR_FLOOR_ID, name: 'Outdoor', width: 900, height: 600},
    ],
    activeFloorId: MAIN_HALL_FLOOR_ID,
    tables: mainHallTables,
    sessions: mainHallSessions,
    onlineStaffCount: 2,
    notificationCount: 3,
  },
  [OUTDOOR_FLOOR_ID]: {
    floors: [
      {id: MAIN_HALL_FLOOR_ID, name: 'Main Hall Area', width: 1200, height: 900},
      {id: OUTDOOR_FLOOR_ID, name: 'Outdoor', width: 900, height: 600},
    ],
    activeFloorId: OUTDOOR_FLOOR_ID,
    tables: outdoorTables,
    sessions: [],
    onlineStaffCount: 2,
    notificationCount: 3,
  },
};

export function getMockFloorData(floorId?: string): FloorData {
  const resolvedId = floorId && floorDataById[floorId]
    ? floorId
    : MAIN_HALL_FLOOR_ID;

  return floorDataById[resolvedId];
}

export const MOCK_FLOOR_DATA = getMockFloorData();
