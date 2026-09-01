export type TableShape = 'square' | 'round' | 'rectangle';

export type GridMode = 'lines' | 'dots' | 'none';

export type TableDisplayStatus =
  | 'AVAILABLE'
  | 'SERVING'
  | 'PAYMENT'
  | 'ORDERING'
  | 'COMBINED'
  | 'BOOKED';

export interface Floor {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface FloorTable {
  id: string;
  tableNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: TableShape;
  seats: number;
  section?: string;
}

export interface TableSession {
  id: string;
  sessionId?: string;
  tableId: string;
  linkedTableIds: string[];
  tableNumbers?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  guestCount: number;
  effectiveSeatCount?: number;
  status?: string;
  openedAt?: string;
  hasActiveOrder: boolean;
  orderTakerName?: string | null;
}

export interface FloorData {
  floors: Floor[];
  activeFloorId: string;
  tables: FloorTable[];
  sessions: TableSession[];
  onlineStaffCount?: number;
  notificationCount?: number;
}

export interface ContentBounds {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}
