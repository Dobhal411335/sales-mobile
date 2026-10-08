import type {KotLineItem, ReceiptMode, ReceiptOrder} from '../types/receipt';
import type {
  PrintJob,
  PrintJobDetailData,
  PrintJobEmployee,
  PrintJobStatus,
  PrinterTarget,
  PrintType,
} from '../types/printJob';
import {
  filterItemsBySeat,
  formatMergedSeatLabel,
  formatSeatLabel,
  proportionalOrderTotalsForItems,
  resolveSplitReceiptSeatFilter,
} from './seatHelpers';

export function getPrintJobStatusLabel(status: PrintJobStatus): string {
  switch (status) {
    case 'QUEUED':
      return 'Queued';
    case 'PRINTING':
      return 'Printing';
    case 'PRINTED':
      return 'Printed';
    case 'FAILED':
      return 'Failed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

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

export function printJobSeatLabel(
  job: PrintJob,
  order?: PrintJobDetailData['order'] | null,
): string | null {
  const meta = job.metadata ?? {};
  const seatFilter = resolveSplitReceiptSeatFilter(
    meta as Record<string, unknown>,
    order
      ? {
          items: order.items,
          paymentSplits: order.paymentSplits,
        }
      : null,
  );

  if (seatFilter.filter) {
    if (
      Array.isArray(meta.splitSeatNumbers) &&
      meta.splitSeatNumbers.length > 1
    ) {
      return formatMergedSeatLabel(meta.splitSeatNumbers);
    }
    // Shared table-bucket slips already show the table number — skip "Table" seat.
    if (seatFilter.seatNumber == null) {
      return null;
    }
    return formatSeatLabel(seatFilter.seatNumber);
  }

  if (meta.filterReceiptBySeat || meta.splitSeatNumber != null) {
    if (
      Array.isArray(meta.splitSeatNumbers) &&
      meta.splitSeatNumbers.length > 1
    ) {
      return formatMergedSeatLabel(meta.splitSeatNumbers);
    }
    if (meta.splitSeatNumber == null) {
      return null;
    }
    return formatSeatLabel(meta.splitSeatNumber);
  }

  return null;
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
  const isSplit = Boolean(meta.isSplitReceipt);
  const seatFilter = resolveSplitReceiptSeatFilter(
    meta as Record<string, unknown>,
    order
      ? {
          items: order.items,
          paymentSplits: order.paymentSplits,
        }
      : null,
  );

  if (order) {
    const splitParty =
      meta.splitName || meta.partyName || meta.guestName || undefined;
    const allItems = Array.isArray(order.items) ? order.items : [];
    const items = seatFilter.filter
      ? filterItemsBySeat(allItems, seatFilter.seatNumber)
      : allItems;
    const seatScoped =
      seatFilter.filter && isSplit
        ? proportionalOrderTotalsForItems(order, items)
        : null;

    return {
      ...order,
      orderNumber: String(order.orderNumber ?? meta.orderNumber ?? '—'),
      tableNo: order.tableNo ?? meta.tableNo?.toString(),
      guestName: isSplit
        ? String(splitParty || order.guestName || '')
        : order.guestName ?? meta.guestName,
      partyName: isSplit
        ? String(splitParty || order.partyName || '')
        : order.partyName ?? meta.partyName,
      guestCount: order.guestCount ?? data.guestCount ?? meta.guestCount,
      items,
      paymentMethod: isSplit
        ? meta.paymentMethod ??
          (meta.splitMethod
            ? meta.splitCardType
              ? `${meta.splitMethod} - ${meta.splitCardType}`
              : meta.splitMethod
            : order.paymentMethod)
        : order.paymentMethod ?? meta.paymentMethod,
      cashAmount: isSplit
        ? meta.cashAmount ??
          (meta.splitMethod === 'Cash' ? meta.splitAmount : 0)
        : order.cashAmount ?? meta.cashAmount,
      cardAmount: isSplit
        ? meta.cardAmount ??
          (meta.splitMethod === 'Card' ? meta.splitAmount : 0)
        : order.cardAmount ?? meta.cardAmount,
      giftcardUsedAmount: isSplit
        ? meta.giftcardUsedAmount ?? 0
        : order.giftcardUsedAmount ?? meta.giftcardUsedAmount,
      totalAmount: isSplit
        ? meta.splitAmount ?? meta.totalAmount ?? order.totalAmount
        : seatScoped?.totalAmount ?? order.totalAmount ?? meta.totalAmount,
      subTotal: seatScoped
        ? seatScoped.subTotal
        : isSplit
          ? meta.subTotal ?? meta.splitAmount ?? order.subTotal
          : order.subTotal ?? meta.subTotal,
      discountTotal: seatScoped
        ? seatScoped.discountTotal
        : isSplit
          ? meta.discountTotal ?? 0
          : order.discountTotal ?? meta.discountTotal,
      discountPercent: isSplit
        ? meta.discountPercent ?? null
        : order.discountPercent ?? meta.discountPercent,
      taxTotal: seatScoped
        ? seatScoped.taxTotal
        : isSplit
          ? meta.taxTotal ?? 0
          : order.taxTotal ?? meta.taxTotal,
      tipAmount: isSplit ? meta.tipAmount ?? 0 : order.tipAmount ?? meta.tipAmount,
      tipMethod: isSplit
        ? meta.tipMethod
        : order.tipMethod ?? meta.tipMethod,
      serviceChargeTotal: seatScoped
        ? seatScoped.serviceChargeTotal
        : isSplit
          ? meta.serviceChargeTotal ?? 0
          : order.serviceChargeTotal ?? meta.serviceChargeTotal,
      serviceChargeName: isSplit
        ? meta.serviceChargeName
        : order.serviceChargeName ?? meta.serviceChargeName,
      paymentSplits: order.paymentSplits,
      taxBreakdown: seatScoped?.taxBreakdown ?? order.taxBreakdown,
      ...(seatFilter.filter ? {filterReceiptBySeat: true as const} : {}),
    };
  }

  return {
    orderNumber: String(meta.orderNumber ?? '—'),
    tableNo: meta.tableNo?.toString(),
    guestName: meta.splitName || meta.guestName,
    partyName: meta.splitName || meta.partyName,
    guestCount: data.guestCount ?? meta.guestCount,
    createdAt: job.createdAt,
    paymentMethod:
      meta.paymentMethod ||
      (meta.splitMethod
        ? meta.splitCardType
          ? `${meta.splitMethod} - ${meta.splitCardType}`
          : meta.splitMethod
        : undefined),
    cashAmount:
      meta.cashAmount ??
      (meta.splitMethod === 'Cash' ? meta.splitAmount : undefined),
    cardAmount:
      meta.cardAmount ??
      (meta.splitMethod === 'Card' ? meta.splitAmount : undefined),
    giftcardUsedAmount: meta.giftcardUsedAmount,
    totalAmount: meta.splitAmount ?? meta.totalAmount,
    subTotal: meta.subTotal ?? meta.splitAmount,
    discountTotal: meta.discountTotal,
    discountPercent: meta.discountPercent,
    taxTotal: meta.taxTotal,
    tipAmount: meta.tipAmount,
    tipMethod: meta.tipMethod,
    serviceChargeTotal: meta.serviceChargeTotal,
    serviceChargeName: meta.serviceChargeName,
  };
}

export function printTypeLabelForJob(job: PrintJob): string {
  if (job?.metadata?.isSplitReceipt) {
    const idx = job.metadata.splitIndex;
    const total = job.metadata.splitTotal;
    if (idx && total) {
      return `Split ${idx}/${total}`;
    }
    return 'Split Receipt';
  }
  return printTypeLabel(job.printType);
}

export function printerNameForTarget(
  printers: Array<{target: PrinterTarget; name: string}>,
  target: PrinterTarget,
): string | null {
  const match = printers.find((printer) => printer.target === target);
  return match?.name ?? null;
}
