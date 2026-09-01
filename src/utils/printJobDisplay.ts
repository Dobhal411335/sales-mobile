import type {KotLineItem, ReceiptMode, ReceiptOrder} from '../types/receipt';
import type {
  PrintJob,
  PrintJobDetailData,
  PrintJobEmployee,
  PrinterTarget,
  PrintType,
} from '../types/printJob';

export function orderLabel(job: PrintJob): string {
  const fromMeta = job.metadata?.orderNumber;
  if (fromMeta != null && fromMeta !== '') {
    return String(fromMeta);
  }
  const orderRef = job.orderId;
  if (orderRef && typeof orderRef === 'object' && orderRef.orderNumber != null) {
    return String(orderRef.orderNumber);
  }
  return '—';
}

export function tableLabel(job: PrintJob): string | null {
  const tableNo =
    job.metadata?.tableNo ??
    (typeof job.orderId === 'object' ? job.orderId?.tableNo : undefined);
  if (tableNo == null || tableNo === '') {
    return null;
  }
  return `Table ${tableNo}`;
}

export function employeeLabel(employee?: PrintJobEmployee | string | null): string {
  if (!employee) {
    return '—';
  }
  if (typeof employee === 'string') {
    return employee;
  }
  if (employee.name) {
    return employee.name;
  }
  const parts = [employee.firstName, employee.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

export function printerTargetLabel(target: PrinterTarget): string {
  if (target === 'KITCHEN') {
    return 'Kitchen';
  }
  if (target === 'COUNTER') {
    return 'Counter';
  }
  return 'Front';
}

export function printTypeLabel(type: PrintType): string {
  if (type === 'BAR_RECEIPT') {
    return 'BAR RECEIPT';
  }
  return type;
}

export function printTypeToReceiptMode(type: PrintType): ReceiptMode {
  if (type === 'KOT') {
    return 'kot';
  }
  if (type === 'BAR_RECEIPT') {
    return 'bar';
  }
  return 'customer';
}

export function formatPrintJobListTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPrintJobDetailTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getTicketItems(data: PrintJobDetailData): KotLineItem[] {
  if (data.kotItems?.length) {
    return data.kotItems;
  }
  const meta = data.job.metadata;
  if (meta?.barItems?.length) {
    return meta.barItems;
  }
  if (meta?.kotItems?.length) {
    return meta.kotItems;
  }
  return [];
}

export function buildReceiptOrderFromDetail(data: PrintJobDetailData): ReceiptOrder {
  const {job, order} = data;
  const meta = job.metadata ?? {};

  if (order) {
    return {
      ...order,
      orderNumber: String(order.orderNumber ?? meta.orderNumber ?? '—'),
      tableNo: order.tableNo ?? meta.tableNo?.toString(),
      guestName: order.guestName ?? meta.guestName,
      partyName: order.partyName ?? meta.partyName,
      guestCount: order.guestCount ?? data.guestCount ?? meta.guestCount,
    };
  }

  return {
    orderNumber: String(meta.orderNumber ?? '—'),
    tableNo: meta.tableNo?.toString(),
    guestName: meta.guestName,
    partyName: meta.partyName,
    guestCount: data.guestCount ?? meta.guestCount,
    createdAt: job.createdAt,
  };
}

export function printerNameForTarget(
  printers: Array<{target: PrinterTarget; name: string}>,
  target: PrinterTarget,
): string | null {
  const match = printers.find((printer) => printer.target === target);
  return match?.name ?? null;
}
