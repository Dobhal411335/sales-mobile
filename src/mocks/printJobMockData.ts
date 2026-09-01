import type {
  PrintJob,
  PrintJobDetailData,
  PrintJobFilter,
  PrinterConfig,
} from '../types/printJob';
import {filterToApiStatus} from '../types/printJob';

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

const MOCK_PRINTERS: PrinterConfig[] = [
  {
    _id: 'printer-kitchen',
    name: 'Kitchen Star TSP100',
    target: 'KITCHEN',
    host: '192.168.1.50',
    port: 9100,
    enabled: true,
  },
  {
    _id: 'printer-counter',
    name: 'Bar Counter',
    target: 'COUNTER',
    host: '192.168.1.51',
    port: 9100,
    enabled: true,
  },
  {
    _id: 'printer-front',
    name: 'Front Receipt',
    target: 'RECEIPT',
    host: '192.168.1.52',
    port: 9100,
    enabled: true,
  },
];

const MOCK_JOBS: PrintJob[] = [
  {
    _id: 'print-0163-kot',
    printType: 'KOT',
    printerTarget: 'KITCHEN',
    status: 'PRINTED',
    attemptCount: 1,
    createdAt: minutesAgo(45),
    metadata: {
      orderNumber: '0163',
      tableNo: '03',
      serverName: 'Akhil Maratha',
      guestCount: 4,
      restaurantName: 'Tasty Bites',
      kotItems: [
        {name: 'Hungry Man', qty: 1, category: 'Mains'},
        {name: 'Garlic Bread', qty: 2, category: 'Starters'},
      ],
    },
    requestedBy: {firstName: 'Akhil', lastName: 'Maratha', name: 'Akhil Maratha'},
    orderId: {orderNumber: '0163', tableNo: '03'},
  },
  {
    _id: 'print-0162-receipt',
    printType: 'RECEIPT',
    printerTarget: 'RECEIPT',
    status: 'QUEUED',
    attemptCount: 0,
    createdAt: minutesAgo(12),
    metadata: {
      orderNumber: '0162',
      tableNo: '03',
      serverName: 'test Test',
      guestCount: 2,
      restaurantName: 'Tasty Bites',
    },
    requestedBy: {firstName: 'test', lastName: 'Test', name: 'test Test'},
    orderId: {orderNumber: '0162', tableNo: '03'},
  },
  {
    _id: 'print-0162-kot',
    printType: 'KOT',
    printerTarget: 'KITCHEN',
    status: 'QUEUED',
    attemptCount: 0,
    createdAt: minutesAgo(13),
    metadata: {
      orderNumber: '0162',
      tableNo: '03',
      serverName: 'test Test',
      guestCount: 2,
      restaurantName: 'Tasty Bites',
      kotItems: [{name: 'Margherita Pizza', qty: 1, category: 'Mains'}],
    },
    requestedBy: {firstName: 'test', lastName: 'Test', name: 'test Test'},
    orderId: {orderNumber: '0162', tableNo: '03'},
  },
  {
    _id: 'print-0161-receipt',
    printType: 'RECEIPT',
    printerTarget: 'RECEIPT',
    status: 'FAILED',
    attemptCount: 2,
    errorMessage: 'Simulated print failure (MockPrinterAdapter)',
    createdAt: minutesAgo(15),
    metadata: {
      orderNumber: '0161',
      tableNo: '03',
      serverName: 'test Test',
      guestCount: 2,
      restaurantName: 'Tasty Bites',
    },
    requestedBy: {firstName: 'test', lastName: 'Test', name: 'test Test'},
    orderId: {orderNumber: '0161', tableNo: '03'},
  },
  {
    _id: 'print-0160-bar',
    printType: 'BAR_RECEIPT',
    printerTarget: 'COUNTER',
    status: 'PRINTING',
    attemptCount: 1,
    createdAt: minutesAgo(8),
    metadata: {
      orderNumber: '0160',
      tableNo: '05',
      serverName: 'Jane Server',
      guestCount: 3,
      restaurantName: 'Tasty Bites',
      barItems: [{name: 'House Lager', qty: 2, category: 'Drinks'}],
    },
    requestedBy: {firstName: 'Jane', lastName: 'Server', name: 'Jane Server'},
    orderId: {orderNumber: '0160', tableNo: '05'},
  },
  {
    _id: 'print-0159-receipt',
    printType: 'RECEIPT',
    printerTarget: 'RECEIPT',
    status: 'PRINTED',
    attemptCount: 1,
    createdAt: minutesAgo(90),
    metadata: {
      orderNumber: '0159',
      tableNo: '01',
      serverName: 'Akhil Maratha',
      guestCount: 2,
      restaurantName: 'Tasty Bites',
    },
    requestedBy: {firstName: 'Akhil', lastName: 'Maratha', name: 'Akhil Maratha'},
    orderId: {orderNumber: '0159', tableNo: '01'},
  },
  {
    _id: 'print-0158-kot',
    printType: 'KOT',
    printerTarget: 'KITCHEN',
    status: 'FAILED',
    attemptCount: 3,
    errorMessage: 'Printer offline',
    createdAt: minutesAgo(20),
    metadata: {
      orderNumber: '0158',
      tableNo: '07',
      serverName: 'Jane Server',
      guestCount: 5,
      restaurantName: 'Tasty Bites',
      kotItems: [{name: 'Fish & Chips', qty: 2, category: 'Mains'}],
    },
    requestedBy: {firstName: 'Jane', lastName: 'Server', name: 'Jane Server'},
    orderId: {orderNumber: '0158', tableNo: '07'},
  },
  {
    _id: 'print-0157-receipt',
    printType: 'RECEIPT',
    printerTarget: 'RECEIPT',
    status: 'CANCELLED',
    attemptCount: 0,
    createdAt: minutesAgo(120),
    metadata: {
      orderNumber: '0157',
      tableNo: '02',
      serverName: 'test Test',
      guestCount: 1,
      restaurantName: 'Tasty Bites',
    },
    requestedBy: {firstName: 'test', lastName: 'Test', name: 'test Test'},
    orderId: {orderNumber: '0157', tableNo: '02'},
  },
];

let mockJobs = [...MOCK_JOBS];

function filterMockJobs(jobs: PrintJob[], filter: PrintJobFilter): PrintJob[] {
  if (filter === 'ALL') {
    return jobs;
  }
  return jobs.filter((job) => job.status === filter);
}

export function getMockPrintJobs(filter: PrintJobFilter = 'ALL'): PrintJob[] {
  return filterMockJobs(
    [...mockJobs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    filter,
  );
}

export function getMockPrinters(): PrinterConfig[] {
  return [...MOCK_PRINTERS];
}

export function getMockPrintJobDetail(id: string): PrintJobDetailData | null {
  const job = mockJobs.find((item) => item._id === id);
  if (!job) {
    return null;
  }

  const meta = job.metadata ?? {};
  const orderNumber = String(meta.orderNumber ?? '—');
  const isReceipt = job.printType === 'RECEIPT';
  const ticketItems = meta.kotItems ?? meta.barItems ?? [];

  return {
    job: {...job},
    order: isReceipt
      ? {
          orderNumber,
          tableNo: meta.tableNo?.toString(),
          guestName: meta.guestName,
          partyName: meta.partyName,
          guestCount: meta.guestCount,
          createdAt: job.createdAt,
          items: [
            {
              cartId: 'item-1',
              id: 'prod-1',
              name: 'Hungry Man',
              qty: 1,
              price: 15.99,
              tax: 2.65,
              category: 'Mains',
            },
          ],
          subTotal: 15.99,
          taxTotal: 2.65,
          totalAmount: 18.64,
          paymentStatus: 'PAID',
        }
      : {
          orderNumber,
          tableNo: meta.tableNo?.toString(),
          guestName: meta.guestName,
          partyName: meta.partyName,
          guestCount: meta.guestCount,
          createdAt: job.createdAt,
        },
    restaurant: {
      name: meta.restaurantName ?? 'Tasty Bites',
      phone: '(555) 123-4567',
      address: '123 Main St',
    },
    guestCount: meta.guestCount ?? null,
    serverName: meta.serverName ?? null,
    kotItems: ticketItems,
  };
}

export function updateMockPrintJob(id: string, patch: Partial<PrintJob>): PrintJob | null {
  const index = mockJobs.findIndex((item) => item._id === id);
  if (index === -1) {
    return null;
  }
  mockJobs[index] = {...mockJobs[index], ...patch};
  return mockJobs[index];
}

export function resetMockPrintJobs(): void {
  mockJobs = [...MOCK_JOBS];
}

export function filterMockJobsByStatus(
  jobs: PrintJob[],
  filter: PrintJobFilter,
): PrintJob[] {
  return filterMockJobs(jobs, filter);
}

export function apiFilterToMockFilter(filter?: string): PrintJobFilter {
  if (!filter || filter === 'ALL') {
    return 'ALL';
  }
  return filter as PrintJobFilter;
}

export {filterToApiStatus};
