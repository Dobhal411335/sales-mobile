import type {BillPrintPayload, KotPrintPayload} from '../types/receipt';

/**
 * Printer service placeholder.
 * Future: Star SDK / network printer integration.
 */
export const printerService = {
  isReady: false,

  printKOT: async (payload: KotPrintPayload): Promise<void> => {
    console.log('[printerService] printKOT placeholder', {
      orderNumber: payload.order.orderNumber,
      ticketType: payload.ticketType,
      itemCount: payload.kotItems.length,
    });
  },

  printBill: async (payload: BillPrintPayload): Promise<void> => {
    console.log('[printerService] printBill placeholder', {
      orderNumber: payload.order.orderNumber,
      total: payload.order.totalAmount,
    });
  },

  print: async (_payload: unknown): Promise<void> => {
    throw new Error('Printer integration is not implemented yet.');
  },
};
