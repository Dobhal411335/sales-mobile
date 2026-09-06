import {config} from '../constants/config';
import {
  completePrintJob,
  fetchPrintJob,
  fetchPrinters,
  printTest,
} from '../services/printJobService';
import type {PrinterConfig} from '../types/printJob';
import type {BillPrintPayload, KotPrintPayload} from '../types/receipt';
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
 * Executes direct network printing for a specific PrintJob ID.
 * Finds the configured network printer for the job's target, builds ESC/POS data,
 * transmits over TCP port 9100, and calls /complete API.
 */
export async function printJobById(jobId: string): Promise<PrintJobActionResult> {
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

  const printersRes = await fetchPrinters();
  const printers = printersRes.data || [];

  // Match printer by job.printerId first, or by target
  let targetPrinter = printers.find(
    (p) => String(p._id) === String(job.printerId) && isNetworkPrinter(p),
  );
  if (!targetPrinter) {
    targetPrinter = printers.find(
      (p) => p.target === job.printerTarget && isNetworkPrinter(p),
    );
  }

  // If no network printer, it may be handled by Windows USB bridge
  if (!targetPrinter || !targetPrinter.host) {
    return {
      success: true,
      message: 'Job queued on server for local print bridge.',
      mode: 'backend',
    };
  }

  const base64Data = buildTicketFromJob({
    job,
    order,
    kotItems,
    restaurantName: restaurant?.name || job.metadata?.restaurantName,
    restaurantDetails: restaurant,
    serverName,
    guestCount,
  });

  const printResult = await sendRawToNetworkPrinter(
    {host: targetPrinter.host, port: targetPrinter.port || 9100},
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
    _payload: BillPrintPayload,
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
        message: 'No receipt print job. Payment may still be recorded.',
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
      port: printer.port || 9100,
      connectionType: printer.connectionType || 'LAN',
    });

    const result = await sendRawToNetworkPrinter(
      {host: printer.host, port: printer.port || 9100},
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
