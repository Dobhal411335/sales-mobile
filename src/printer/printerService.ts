import {config} from '../constants/config';
import {
  claimPrintJob,
  completePrintJob,
  fetchPrintJob,
  fetchPrintJobs,
  fetchPrinters,
  printTest,
} from '../services/printJobService';
import type {PrintJob, PrinterConfig} from '../types/printJob';
import type {BillPrintPayload, KotPrintPayload, ReceiptOrder} from '../types/receipt';
import {buildTestTicket, buildTicketFromJob} from './escpos';
import {sendRawToNetworkPrinter} from './networkPrinter';

export type PrintMode = 'backend' | 'mock' | 'native';

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
}

export function isNetworkPrinter(printer?: PrinterConfig | null): boolean {
  if (!printer || printer.enabled === false) return false;
  const conn = String(printer.connectionType || 'LAN').toUpperCase();
  const isNet = conn === 'LAN' || conn === 'NETWORK';
  return isNet && Boolean(printer.host?.trim());
}

/**
 * Pick network printer for a job:
 * - Prefer job.printerId when still enabled/printable
 * - Exactly one enabled network printer → use it for any target
 * - Multiple → match by printerTarget
 */
export function pickNetworkPrinter(
  printers: PrinterConfig[],
  opts: {
    printerId?: string | null;
    printerTarget?: PrinterConfig['target'] | string | null;
  } = {},
): PrinterConfig | null {
  const enabledNet = (printers || []).filter((p) => isNetworkPrinter(p));
  if (!enabledNet.length) return null;

  const {printerId, printerTarget} = opts;

  if (printerId) {
    const byId = enabledNet.find((p) => String(p._id) === String(printerId));
    if (byId) return byId;
  }

  if (enabledNet.length === 1) {
    return enabledNet[0];
  }

  if (printerTarget) {
    return (
      enabledNet.find((p) => p.target === printerTarget) || null
    );
  }

  return null;
}

/**
 * Drain QUEUED network print jobs (startup / resume / printer-back-online).
 * Uses claim inside printJobById — safe for multi-device. Skips USB-only shops.
 */
export async function drainQueuedNetworkJobs(
  processing?: Set<string>,
): Promise<{attempted: number; printed: number}> {
  const printersRes = await fetchPrinters();
  const printers = printersRes.data || [];
  const hasNetwork = printers.some((p) => isNetworkPrinter(p));
  if (!hasNetwork) {
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
    if (processing?.has(jobId)) continue;

    const targetPrinter = pickNetworkPrinter(printers, {
      printerId: job.printerId,
      printerTarget: job.printerTarget,
    });
    if (!targetPrinter?.host) continue;

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
 * Executes direct network printing for a specific PrintJob ID.
 * Finds the configured network printer for the job's target, builds ESC/POS data,
 * transmits over TCP port 9100, and calls /complete API.
 */
export async function printJobById(
  jobId: string,
  fallbackOrder?: Partial<ReceiptOrder> | null,
): Promise<PrintJobActionResult> {
  const mode = getPrintMode();
  if (mode === 'mock') {
    return {success: true, message: 'Mock mode — no physical printer.', mode};
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

  // Concurrency guard: Do not re-print jobs already marked printed or cancelled by another client
  if (job?.status && job.status !== 'QUEUED') {
    return {
      success: true,
      message: `Print job is already ${job.status.toLowerCase()}.`,
      mode,
    };
  }
  const rawMerged = order
    ? {...job?.metadata, ...fallbackOrder, ...order}
    : (fallbackOrder || job?.metadata ? {...job?.metadata, ...fallbackOrder} : null);
  const mergedOrder: Partial<ReceiptOrder> | null = rawMerged
    ? ({
        ...rawMerged,
        orderNumber: rawMerged.orderNumber != null ? String(rawMerged.orderNumber) : undefined,
      } as Partial<ReceiptOrder>)
    : null;

  const printersRes = await fetchPrinters();
  const printers = printersRes.data || [];

  const targetPrinter = pickNetworkPrinter(printers, {
    printerId: job.printerId,
    printerTarget: job.printerTarget,
  });

  // If no network printer, it may be handled by Windows USB bridge
  if (!targetPrinter || !targetPrinter.host) {
    return {
      success: true,
      message: 'Job queued on server for local print bridge.',
      mode: 'backend',
    };
  }
  
  // Atomic claim to ensure only one device prints the job in multi-device setups
  const claim = await claimPrintJob(jobId);
  if (!claim.claimed) {
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
  });

  const printResult = await sendRawToNetworkPrinter(
    {host: targetPrinter.host, port: targetPrinter.port || config.DEFAULT_PRINTER_PORT},
    base64Data,
  );

  if (printResult.success) {
    await completePrintJob(jobId, true);
    return {
      success: true,
      message: `Printed to ${targetPrinter.name} (${targetPrinter.host})`,
      mode: 'native',
    };
  } else {
    await completePrintJob(jobId, false, printResult.error);
    return {
      success: false,
      message: `Print failed (${targetPrinter.name}): ${printResult.error}`,
      mode: 'native',
    };
  }
}

export const printerService = {
  isReady: true,

  getPrintMode,

  printJobById,

  drainQueuedNetworkJobs,

  printKOT: async (
    _payload: KotPrintPayload,
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

    // Prefer the queued print-job path only (claim + complete). Do not
    // bypass the queue with a direct ESC/POS write — that risks duplicates.
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
    if (!isNetworkPrinter(printer) || !printer.host) {
      return {
        success: false,
        message: 'Printer is not configured for network/LAN printing.',
        mode: 'native',
      };
    }

    const base64Data = buildTestTicket({
      name: printer.name,
      target: printer.target,
      host: printer.host,
      port: printer.port || config.DEFAULT_PRINTER_PORT,
      connectionType: printer.connectionType || 'LAN',
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
