import {Platform} from 'react-native';
import {config} from '../constants/config';
import {
  claimPrintJob,
  completePrintJob,
  fetchPrintJob,
  fetchPrintJobs,
  fetchPrinters,
  printTest,
  retryPrintJob,
} from '../services/printJobService';
import type {PrintJob, PrinterConfig, PrinterTarget} from '../types/printJob';
import type {
  BillPrintPayload,
  KotLineItem,
  KotPrintPayload,
  ReceiptOrder,
  TicketType,
} from '../types/receipt';
import {
  isBluetoothModuleReady,
  isBluetoothPrinterConfig,
  probeBluetoothPrinter,
  sendRawToBluetoothPrinter,
} from './bluetoothPrinter';
import {
  buildBarTicket,
  buildKotTicket,
  buildReceiptTicket,
  buildTestTicket,
  buildTicketFromJob,
} from './escpos';
import {sendRawToNetworkPrinter} from './networkPrinter';
import {
  isBuiltInUsbModuleReady,
  isBuiltInUsbPrinterConfig,
  probeBuiltInUsbPrinter,
  sendRawToBuiltInUsbPrinter,
} from './usbPrinter';

export type PrintMode = 'backend' | 'mock' | 'native';

/** Jobs claimed/printed locally — agent should skip while in-flight. */
const localHandledJobs = new Set<string>();

export function markPrintJobHandledLocally(jobId?: string | null): void {
  if (jobId) localHandledJobs.add(String(jobId));
}

export function wasPrintJobHandledLocally(jobId?: string | null): boolean {
  return Boolean(jobId && localHandledJobs.has(String(jobId)));
}

export function clearLocalPrintJobMark(jobId?: string | null): void {
  if (jobId) localHandledJobs.delete(String(jobId));
}

export function getPrintMode(): PrintMode {
  if (!config.API_BASE_URL) {
    return 'mock';
  }
  return 'native';
}

export interface PrintJobActionResult {
  success: boolean;
  message?: string;
  mode: PrintMode;
  printedLocally?: boolean;
}

export function isNetworkPrinter(printer?: PrinterConfig | null): boolean {
  if (!printer || printer.enabled === false) return false;
  const conn = String(printer.connectionType || 'LAN').toUpperCase();
  const isNet = conn === 'LAN' || conn === 'NETWORK';
  return isNet && Boolean(printer.host?.trim());
}

/** Android POS tablet built-in 80mm (AutoReplyPrint USB). */
export function isBuiltInUsbPrinter(printer?: PrinterConfig | null): boolean {
  return (
    Platform.OS === 'android' &&
    isBuiltInUsbModuleReady() &&
    isBuiltInUsbPrinterConfig(printer)
  );
}

export function isBluetoothPrinter(printer?: PrinterConfig | null): boolean {
  return (
    Platform.OS === 'android' &&
    isBluetoothModuleReady() &&
    isBluetoothPrinterConfig(printer)
  );
}

export function canPrintLocally(printer?: PrinterConfig | null): boolean {
  return (
    isNetworkPrinter(printer) ||
    isBuiltInUsbPrinter(printer) ||
    isBluetoothPrinter(printer)
  );
}

/**
 * Pick a locally printable printer for a job:
 * - Prefer job.printerId when still enabled/printable
 * - Exactly one enabled local printer → use it for any target
 * - Multiple → match by printerTarget
 */
export function pickNetworkPrinter(
  printers: PrinterConfig[],
  opts: {
    printerId?: string | null;
    printerTarget?: PrinterConfig['target'] | string | null;
  } = {},
): PrinterConfig | null {
  return pickLocalPrinter(printers, opts);
}

export function pickLocalPrinter(
  printers: PrinterConfig[],
  opts: {
    printerId?: string | null;
    printerTarget?: PrinterConfig['target'] | string | null;
  } = {},
): PrinterConfig | null {
  const enabled = (printers || []).filter((p) => canPrintLocally(p));
  if (!enabled.length) return null;

  const {printerId, printerTarget} = opts;

  if (printerId) {
    const byId = enabled.find((p) => String(p._id) === String(printerId));
    if (byId) return byId;
  }

  if (enabled.length === 1) {
    return enabled[0];
  }

  if (printerTarget) {
    return enabled.find((p) => p.target === printerTarget) || null;
  }

  return null;
}

async function sendRawToPrinter(
  printer: PrinterConfig,
  base64Data: string,
): Promise<{success: boolean; error?: string; where?: string}> {
  if (isBluetoothPrinter(printer) && printer.bluetoothAddress) {
    const result = await sendRawToBluetoothPrinter(
      printer.bluetoothAddress,
      base64Data,
    );
    return {
      success: result.success,
      error: result.error,
      where: `${printer.name} (BT ${printer.bluetoothAddress})`,
    };
  }

  if (isBuiltInUsbPrinter(printer)) {
    const result = await sendRawToBuiltInUsbPrinter(base64Data, {
      vendorId: printer.usbVendorId,
      productId: printer.usbProductId,
    });
    return {
      success: result.success,
      error: result.error,
      where: `${printer.name} (built-in USB)`,
    };
  }

  if (isNetworkPrinter(printer) && printer.host) {
    const result = await sendRawToNetworkPrinter(
      {
        host: printer.host,
        port: printer.port || config.DEFAULT_PRINTER_PORT,
      },
      base64Data,
    );
    return {
      success: result.success,
      error: result.error,
      where: `${printer.name} (${printer.host})`,
    };
  }

  return {success: false, error: 'Printer transport not available on this device'};
}

/**
 * Drain QUEUED print jobs (startup / resume / printer-back-online).
 * Handles network TCP, Android built-in USB, and Bluetooth.
 */
export async function drainQueuedNetworkJobs(
  processing?: Set<string>,
): Promise<{attempted: number; printed: number}> {
  const printersRes = await fetchPrinters();
  const printers = printersRes.data || [];
  const hasLocal = printers.some((p) => canPrintLocally(p));
  if (!hasLocal) {
    return {attempted: 0, printed: 0};
  }

  const listRes = await fetchPrintJobs({status: 'QUEUED', limit: 20});
  const jobs: PrintJob[] = listRes.data || [];
  if (!jobs.length) {
    return {attempted: 0, printed: 0};
  }

  let attempted = 0;
  let printed = 0;

  for (const job of jobs) {
    const jobId = String(job._id);
    if (processing?.has(jobId) || wasPrintJobHandledLocally(jobId)) continue;

    const targetPrinter = pickLocalPrinter(printers, {
      printerId: job.printerId,
      printerTarget: job.printerTarget,
    });
    if (!targetPrinter || !canPrintLocally(targetPrinter)) continue;

    if (isBuiltInUsbPrinter(targetPrinter)) {
      const probe = await probeBuiltInUsbPrinter();
      if (!probe.success) continue;
    }
    if (isBluetoothPrinter(targetPrinter) && targetPrinter.bluetoothAddress) {
      const probe = await probeBluetoothPrinter(targetPrinter.bluetoothAddress);
      if (!probe.success) continue;
    }

    attempted += 1;
    processing?.add(jobId);
    try {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 200) + 50),
      );
      const result = await printJobById(jobId);
      if (result.success && result.mode === 'native') {
        printed += 1;
      }
    } catch (err) {
      console.warn('[drainQueuedNetworkJobs] failed:', jobId, err);
    } finally {
      processing?.delete(jobId);
    }
  }

  return {attempted, printed};
}

/**
 * Executes direct network/USB/BT printing for a specific PrintJob ID.
 */
export async function printJobById(
  jobId: string,
  fallbackOrder?: Partial<ReceiptOrder> | null,
): Promise<PrintJobActionResult> {
  const mode = getPrintMode();
  if (mode === 'mock') {
    return {success: true, message: 'Mock mode — no physical printer.', mode};
  }

  if (wasPrintJobHandledLocally(jobId)) {
    return {
      success: true,
      message: 'Print job already handled locally.',
      mode: 'native',
      printedLocally: true,
    };
  }

  const detailRes = await fetchPrintJob(jobId);
  if (!detailRes.success || !detailRes.data) {
    return {
      success: false,
      message: detailRes.message || 'Unable to load print job details.',
      mode,
    };
  }

  const {job, order, kotItems, restaurant, serverName, guestCount} = detailRes.data;

  if (job?.status && job.status !== 'QUEUED') {
    return {
      success: true,
      message: `Print job is already ${job.status.toLowerCase()}.`,
      mode,
    };
  }
  const rawMerged = order
    ? {...job?.metadata, ...fallbackOrder, ...order}
    : fallbackOrder || job?.metadata
      ? {...job?.metadata, ...fallbackOrder}
      : null;
  const mergedOrder: Partial<ReceiptOrder> | null = rawMerged
    ? ({
        ...rawMerged,
        orderNumber:
          rawMerged.orderNumber != null ? String(rawMerged.orderNumber) : undefined,
      } as Partial<ReceiptOrder>)
    : null;

  const printersRes = await fetchPrinters();
  const printers = printersRes.data || [];

  let targetPrinter = pickLocalPrinter(printers, {
    printerId: job.printerId,
    printerTarget: job.printerTarget,
  });

  if ((!targetPrinter || !canPrintLocally(targetPrinter)) && Platform.OS === 'android') {
    targetPrinter = printers.find((p) => isBuiltInUsbPrinter(p)) || null;
    if (!targetPrinter) {
      const probe = await probeBuiltInUsbPrinter();
      if (probe.success) {
        targetPrinter = {
          _id: job.printerId || 'builtin-fallback',
          name: 'Built-in Receipt',
          target: job.printerTarget || 'KITCHEN',
          connectionType: 'USB',
          systemPrinterName: 'BUILTIN',
          enabled: true,
        };
      }
    }
  }

  if (!targetPrinter || !canPrintLocally(targetPrinter)) {
    const conn = String(targetPrinter?.connectionType || '').toUpperCase();
    if (Platform.OS === 'android' && conn === 'USB') {
      console.warn(
        '[printJobById] USB printer configured but native module not ready',
        targetPrinter?.name,
      );
      return {
        success: false,
        message:
          'Built-in USB printer module not ready. Rebuild/reinstall the Android Sales app.',
        mode: 'native',
      };
    }
    console.warn(
      '[printJobById] No locally printable printer for job',
      jobId,
      'target=',
      job.printerTarget,
      'printerId=',
      job.printerId,
    );
    return {
      success: true,
      message: 'Job queued on server for local print bridge.',
      mode: 'backend',
    };
  }

  if (isBuiltInUsbPrinter(targetPrinter)) {
    const probe = await probeBuiltInUsbPrinter();
    if (!probe.success) {
      console.warn('[printJobById] built-in USB probe failed', probe.error);
      return {
        success: false,
        message: probe.error || 'Built-in USB printer not available on this device.',
        mode: 'native',
      };
    }
  }

  if (isBluetoothPrinter(targetPrinter) && targetPrinter.bluetoothAddress) {
    const probe = await probeBluetoothPrinter(targetPrinter.bluetoothAddress);
    if (!probe.success) {
      return {
        success: false,
        message: probe.error || 'Bluetooth printer not available.',
        mode: 'native',
      };
    }
  }

  markPrintJobHandledLocally(jobId);
  const claim = await claimPrintJob(jobId);
  if (!claim.claimed) {
    console.warn('[printJobById] claim failed / already claimed', jobId, claim);
    return {
      success: true,
      message: 'Print job already claimed or printed by another station.',
      mode: 'native',
    };
  }

  const base64Data = buildTicketFromJob({
    job,
    order: mergedOrder,
    kotItems,
    restaurantName: restaurant?.name || job.metadata?.restaurantName,
    restaurantDetails: restaurant,
    serverName,
    guestCount,
    paperWidthMm: targetPrinter.paperWidthMm,
  });

  const printResult = await sendRawToPrinter(targetPrinter, base64Data);

  if (printResult.success) {
    await completePrintJob(jobId, true);
    return {
      success: true,
      message: `Printed to ${printResult.where || targetPrinter.name}`,
      mode: 'native',
      printedLocally: true,
    };
  }

  clearLocalPrintJobMark(jobId);
  await completePrintJob(jobId, false, printResult.error);
  return {
    success: false,
    message: `Print failed (${targetPrinter.name}): ${printResult.error}`,
    mode: 'native',
  };
}

export interface LocalTicketPrintParams {
  printType: 'KOT' | 'BAR_RECEIPT' | 'RECEIPT';
  kotItems?: KotLineItem[];
  order?: Partial<ReceiptOrder> | null;
  printJobId?: string | null;
  printerTarget?: PrinterTarget | null;
  restaurantName?: string | null;
  serverName?: string | null;
  guestCount?: number | string | null;
  isReprint?: boolean;
  /** When true, still leave queue as fallback if local print fails */
  auditAsync?: boolean;
}

/**
 * Local-first: build ESC/POS from payload already on the device and print
 * immediately. Completes the PrintJob in the background when printJobId is set.
 * If this device cannot reach the printer, leaves the job queued for agents.
 */
export async function printTicketLocally(
  params: LocalTicketPrintParams,
): Promise<PrintJobActionResult> {
  const mode = getPrintMode();
  if (mode === 'mock') {
    return {success: true, message: 'Mock mode — no physical printer.', mode};
  }

  const {
    printType,
    kotItems = [],
    order = null,
    printJobId,
    printerTarget,
    restaurantName,
    serverName,
    guestCount,
    isReprint = false,
    auditAsync = true,
  } = params;

  if (printJobId && wasPrintJobHandledLocally(printJobId)) {
    return {
      success: true,
      message: 'Already printed locally.',
      mode: 'native',
      printedLocally: true,
    };
  }

  const target: PrinterTarget =
    printerTarget ||
    (printType === 'RECEIPT'
      ? 'RECEIPT'
      : printType === 'BAR_RECEIPT'
        ? 'COUNTER'
        : 'KITCHEN');

  let printers: PrinterConfig[] = [];
  try {
    const printersRes = await fetchPrinters();
    printers = printersRes.data || [];
  } catch {
    // continue — may still fall back to queue
  }

  let targetPrinter = pickLocalPrinter(printers, {
    printerTarget: target,
  });

  if ((!targetPrinter || !canPrintLocally(targetPrinter)) && Platform.OS === 'android') {
    targetPrinter = printers.find((p) => isBuiltInUsbPrinter(p)) || null;
    if (!targetPrinter) {
      const probe = await probeBuiltInUsbPrinter();
      if (probe.success) {
        targetPrinter = {
          _id: 'builtin-fallback',
          name: 'Built-in Receipt',
          target,
          connectionType: 'USB',
          systemPrinterName: 'BUILTIN',
          enabled: true,
        };
      }
    }
  }

  // Prefer NETWORK from this device when configured — local-first happy path
  if (!targetPrinter || !canPrintLocally(targetPrinter)) {
    return {
      success: true,
      message: 'No local printer on this device — job remains queued for agent.',
      mode: 'backend',
      printedLocally: false,
    };
  }

  const brand =
    restaurantName || order?.restaurantName || config.APP_NAME.toUpperCase();

  let base64Data: string;
  if (printType === 'RECEIPT') {
    base64Data = buildReceiptTicket({
      order,
      restaurantName: brand,
      serverName: serverName || order?.serverName,
      guestCount: guestCount ?? order?.guestCount,
      isReprint,
      paperWidthMm: targetPrinter.paperWidthMm,
    });
  } else if (printType === 'BAR_RECEIPT') {
    base64Data = buildBarTicket({
      order,
      kotItems,
      restaurantName: brand,
      serverName: serverName || order?.serverName,
      guestCount: guestCount ?? order?.guestCount,
      isReprint,
      paperWidthMm: targetPrinter.paperWidthMm,
    });
  } else {
    base64Data = buildKotTicket({
      order,
      kotItems,
      restaurantName: brand,
      serverName: serverName || order?.serverName,
      guestCount: guestCount ?? order?.guestCount,
      isReprint,
      paperWidthMm: targetPrinter.paperWidthMm,
    });
  }

  if (printJobId) {
    markPrintJobHandledLocally(printJobId);
  }

  // Claim before write to stop socket agent racing
  if (printJobId) {
    try {
      const claim = await claimPrintJob(printJobId);
      if (!claim.claimed) {
        return {
          success: true,
          message: 'Print job already claimed by another station.',
          mode: 'native',
        };
      }
    } catch (err) {
      console.warn('[printTicketLocally] claim failed, printing anyway', err);
    }
  }

  const printResult = await sendRawToPrinter(targetPrinter, base64Data);

  const auditComplete = async (ok: boolean, error?: string) => {
    if (!printJobId || !auditAsync) return;
    try {
      await completePrintJob(printJobId, ok, error);
    } catch (err) {
      console.warn('[printTicketLocally] audit complete failed', err);
    }
  };

  if (printResult.success) {
    void auditComplete(true);
    return {
      success: true,
      message: `Printed to ${printResult.where || targetPrinter.name}`,
      mode: 'native',
      printedLocally: true,
    };
  }

  // Local fail → clear mark and requeue so agent / another device can fall back
  if (printJobId) {
    clearLocalPrintJobMark(printJobId);
    try {
      await retryPrintJob(printJobId);
    } catch (err) {
      console.warn('[printTicketLocally] requeue after fail:', err);
      void auditComplete(false, printResult.error);
    }
  }

  return {
    success: false,
    message:
      printResult.error ||
      'Local print failed — job requeued for print agent fallback.',
    mode: 'native',
    printedLocally: false,
  };
}

export const printerService = {
  isReady: true,

  getPrintMode,

  printJobById,

  printTicketLocally,

  drainQueuedNetworkJobs,

  printKOT: async (
    payload: KotPrintPayload,
    printJobId?: string | null,
  ): Promise<PrintJobActionResult> => {
    const mode = getPrintMode();
    if (mode === 'mock') {
      return {
        success: true,
        message: 'Mock mode — no physical printer.',
        mode,
      };
    }

    // Local-first from payload when we have ticket lines
    if (payload?.kotItems?.length) {
      return printTicketLocally({
        printType: payload.ticketType === 'BAR_RECEIPT' ? 'BAR_RECEIPT' : 'KOT',
        kotItems: payload.kotItems,
        order: payload.order,
        printJobId,
        printerTarget:
          payload.ticketType === 'BAR_RECEIPT' ? 'COUNTER' : 'KITCHEN',
        serverName: payload.serverName,
        guestCount: payload.guestCount,
        isReprint: payload.isReprint,
      });
    }

    if (!printJobId) {
      return {
        success: false,
        message: 'No print job ID. Ticket may still be queued on the server.',
        mode,
      };
    }

    try {
      return await printJobById(printJobId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Network print error';
      return {
        success: false,
        message: errMsg,
        mode,
      };
    }
  },

  printBill: async (
    payload: BillPrintPayload,
    printJobId?: string | null,
  ): Promise<PrintJobActionResult> => {
    const mode = getPrintMode();
    if (mode === 'mock') {
      return {
        success: true,
        message: 'Mock mode — no physical printer.',
        mode,
      };
    }

    // Local-first from paid order snapshot
    if (payload?.order) {
      return printTicketLocally({
        printType: 'RECEIPT',
        order: payload.order,
        printJobId,
        printerTarget: 'RECEIPT',
        restaurantName: payload.restaurantName,
        serverName: payload.serverName,
        guestCount: payload.guestCount,
        isReprint: payload.isReprint,
      });
    }

    if (!printJobId) {
      return {
        success: false,
        message:
          'No print job ID. Use Reprint from Print Jobs or wait for the receipt job to queue.',
        mode,
      };
    }

    try {
      return await printJobById(printJobId, payload.order);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Receipt print error';
      return {
        success: false,
        message: errMsg,
        mode,
      };
    }
  },

  testPrinterDirect: async (
    printer: PrinterConfig,
  ): Promise<PrintJobActionResult> => {
    if (isBluetoothPrinter(printer) && printer.bluetoothAddress) {
      const base64Data = buildTestTicket({
        name: printer.name,
        target: printer.target,
        connectionType: 'BLUETOOTH',
        systemPrinterName: printer.bluetoothAddress,
        paperWidthMm: printer.paperWidthMm,
      });
      const result = await sendRawToBluetoothPrinter(
        printer.bluetoothAddress,
        base64Data,
      );
      return {
        success: result.success,
        message: result.success
          ? `Test ticket printed to ${printer.name} (Bluetooth)`
          : `Test print failed: ${result.error}`,
        mode: 'native',
      };
    }

    if (isBuiltInUsbPrinter(printer)) {
      const base64Data = buildTestTicket({
        name: printer.name,
        target: printer.target,
        connectionType: 'USB',
        systemPrinterName: printer.systemPrinterName || 'BUILTIN',
        paperWidthMm: printer.paperWidthMm,
      });
      const result = await sendRawToBuiltInUsbPrinter(base64Data, {
        vendorId: printer.usbVendorId,
        productId: printer.usbProductId,
      });
      return {
        success: result.success,
        message: result.success
          ? `Test ticket printed to ${printer.name} (built-in USB)`
          : `Test print failed: ${result.error}`,
        mode: 'native',
      };
    }

    if (!isNetworkPrinter(printer) || !printer.host) {
      return {
        success: false,
        message:
          'Printer is not configured for network/LAN, Bluetooth, or built-in USB printing.',
        mode: 'native',
      };
    }

    const base64Data = buildTestTicket({
      name: printer.name,
      target: printer.target,
      host: printer.host,
      port: printer.port || config.DEFAULT_PRINTER_PORT,
      connectionType: printer.connectionType || 'LAN',
      paperWidthMm: printer.paperWidthMm,
    });

    const result = await sendRawToNetworkPrinter(
      {host: printer.host, port: printer.port || config.DEFAULT_PRINTER_PORT},
      base64Data,
    );

    return {
      success: result.success,
      message: result.success
        ? `Test ticket printed to ${printer.name}`
        : `Test print failed: ${result.error}`,
      mode: 'native',
    };
  },

  runPrintTest: async (printJobId: string): Promise<PrintJobActionResult> => {
    const mode = getPrintMode();
    if (mode === 'mock') {
      return {success: true, message: 'Mock print test.', mode};
    }
    const result = await printTest(printJobId);
    return {
      success: result.success,
      message: result.message,
      mode,
    };
  },

  print: async (jobId?: string): Promise<void> => {
    if (!jobId) {
      throw new Error('A printJobId is required to print.');
    }
    const res = await printJobById(jobId);
    if (!res.success) {
      throw new Error(res.message || 'Direct network printing failed.');
    }
  },
};

export type {TicketType};
