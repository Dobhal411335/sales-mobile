import type {KotLineItem, ReceiptOrder} from './receipt';

export const PRINT_TYPES = ['RECEIPT', 'KOT', 'BAR_RECEIPT'] as const;
export type PrintType = (typeof PRINT_TYPES)[number];

export const PRINTER_TARGETS = ['RECEIPT', 'KITCHEN', 'COUNTER'] as const;
export type PrinterTarget = (typeof PRINTER_TARGETS)[number];

export const PRINT_JOB_STATUSES = [
  'QUEUED',
  'PRINTING',
  'PRINTED',
  'FAILED',
  'CANCELLED',
] as const;
export type PrintJobStatus = (typeof PRINT_JOB_STATUSES)[number];

export const PRINT_JOB_FILTERS = [
  'ALL',
  'QUEUED',
  'PRINTING',
  'PRINTED',
  'FAILED',
] as const;
export type PrintJobFilter = (typeof PRINT_JOB_FILTERS)[number];

export interface PrintJobEmployee {
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

export interface PrintJobOrderRef {
  _id?: string;
  orderNumber?: string | number;
  tableNo?: string | number;
  guestName?: string;
  status?: string;
  paymentStatus?: string;
  totalAmount?: number;
}

export interface PrintJobMetadata {
  orderNumber?: string | number;
  tableNo?: string | number;
  kotItems?: KotLineItem[];
  barItems?: KotLineItem[];
  serverName?: string;
  guestCount?: number;
  restaurantName?: string;
  specialNote?: string;
  guestName?: string;
  partyName?: string;
  isReprint?: boolean;
}

export interface PrintJob {
  _id: string;
  restaurantId?: string;
  orderId?: PrintJobOrderRef | string;
  printerId?: string | null;
  parentPrintJobId?: string | null;
  printType: PrintType;
  printerTarget: PrinterTarget;
  status: PrintJobStatus;
  attemptCount?: number;
  startedAt?: string;
  printedAt?: string;
  failedAt?: string;
  errorMessage?: string | null;
  requestedBy?: PrintJobEmployee | string;
  metadata?: PrintJobMetadata;
  createdAt: string;
  updatedAt?: string;
}

export interface PrinterConfig {
  _id: string;
  name: string;
  target: PrinterTarget;
  host?: string;
  port?: number;
  connectionType?: string;
  enabled?: boolean;
}

export interface PrintJobRestaurant {
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
}

export interface PrintJobDetailData {
  job: PrintJob;
  order: ReceiptOrder | null;
  restaurant: PrintJobRestaurant | null;
  guestCount: number | null;
  serverName: string | null;
  kotItems: KotLineItem[];
}

export interface PrintJobEventPayload {
  printJobId: string;
  orderId?: string;
  orderNumber?: string | null;
  printType?: PrintType;
  printerTarget?: PrinterTarget;
  printerId?: string | null;
  connectionType?: string | null;
  status?: PrintJobStatus;
  attemptCount?: number;
  createdAt?: string;
  errorMessage?: string | null;
  tableNo?: string | null;
}

export interface PrintJobActionResult {
  success: boolean;
  message?: string;
  error?: string;
  adapter?: string;
  simulated?: boolean;
}

export interface PrintJobTestData {
  job: PrintJob;
  result: PrintJobActionResult;
  note?: string;
}

export interface PrintJobsListResponse {
  success: boolean;
  data?: PrintJob[];
  message?: string;
}

export interface PrintJobDetailResponse {
  success: boolean;
  data?: PrintJobDetailData;
  message?: string;
}

export interface PrintJobActionResponse {
  success: boolean;
  data?: {
    job?: PrintJob;
    result?: PrintJobActionResult;
  };
  message?: string;
}

export interface PrintJobTestResponse {
  success: boolean;
  data?: PrintJobTestData;
  message?: string;
}

export interface PrintersListResponse {
  success: boolean;
  data?: PrinterConfig[];
  message?: string;
}

export function filterToApiStatus(filter: PrintJobFilter): string | undefined {
  if (filter === 'ALL') {
    return undefined;
  }
  return filter;
}

export function filterDisplayLabel(filter: PrintJobFilter): string {
  if (filter === 'ALL') {
    return 'All';
  }
  return filter.charAt(0) + filter.slice(1).toLowerCase();
}
