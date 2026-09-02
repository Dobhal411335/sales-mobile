import {config} from '../constants/config';
import {fetchPrintJob, printTest, retryPrintJob} from '../services/printJobService';
import type {BillPrintPayload, KotPrintPayload} from '../types/receipt';

export type PrintMode = 'backend' | 'mock' | 'native';

/**
 * Printer layer abstraction.
 * Physical LAN/Star printing is not implemented on mobile — jobs are queued on the backend.
 */
export function getPrintMode(): PrintMode {
  if (!config.API_BASE_URL) {
    return 'mock';
  }
  return 'backend';
}

export interface PrintJobActionResult {
  success: boolean;
  message?: string;
  mode: PrintMode;
}

export const printerService = {
  isReady: getPrintMode() === 'backend',

  getPrintMode,

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
    return {
      success: true,
      message: 'KOT queued on server. Track status in Print Jobs.',
      mode,
    };
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

    const jobResponse = await fetchPrintJob(printJobId);
    if (
      jobResponse.success &&
      jobResponse.data?.job.status === 'FAILED'
    ) {
      const retry = await retryPrintJob(printJobId);
      return {
        success: retry.success,
        message:
          retry.message ??
          (retry.success
            ? 'Receipt print job requeued on server.'
            : 'Unable to retry receipt print job.'),
        mode,
      };
    }

    return {
      success: true,
      message: 'Receipt queued on server. Track status in Print Jobs.',
      mode,
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

  print: async (): Promise<void> => {
    throw new Error(
      'Direct printer integration is not available on mobile. Use print jobs.',
    );
  },
};
