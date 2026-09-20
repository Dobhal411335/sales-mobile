import {create} from 'zustand';

export type PrinterUiStatus = 'ONLINE' | 'OFFLINE' | 'CHECKING' | 'UNKNOWN';

export interface PrinterLiveStatus {
  printerId: string;
  status: PrinterUiStatus;
  host?: string | null;
  port?: number | null;
  error?: string | null;
  checkedAt?: string | null;
  source?: 'mobile' | 'electron' | 'print-bridge' | 'local' | null;
}

interface PrinterStatusState {
  byId: Record<string, PrinterLiveStatus>;
  setChecking: (printerId: string) => void;
  setResult: (
    printerId: string,
    result: Omit<PrinterLiveStatus, 'printerId'> & {printerId?: string},
  ) => void;
  setMany: (entries: PrinterLiveStatus[]) => void;
  clear: () => void;
}

export const usePrinterStatusStore = create<PrinterStatusState>((set) => ({
  byId: {},

  setChecking: (printerId) =>
    set((state) => ({
      byId: {
        ...state.byId,
        [printerId]: {
          ...(state.byId[printerId] || {printerId}),
          printerId,
          status: 'CHECKING',
        },
      },
    })),

  setResult: (printerId, result) =>
    set((state) => ({
      byId: {
        ...state.byId,
        [printerId]: {
          ...(state.byId[printerId] || {printerId}),
          ...result,
          printerId,
        },
      },
    })),

  setMany: (entries) =>
    set((state) => {
      const next = {...state.byId};
      for (const entry of entries) {
        next[entry.printerId] = entry;
      }
      return {byId: next};
    }),

  clear: () => set({byId: {}}),
}));

export function mapReachabilityToUiStatus(
  reach?: {
    status?: string | null;
    checkedAt?: string | null;
    error?: string | null;
    source?: string | null;
  } | null,
  enabled = true,
): PrinterUiStatus {
  if (!enabled) return 'UNKNOWN';
  if (!reach?.status || reach.status === 'unknown' || !reach.checkedAt) {
    return 'UNKNOWN';
  }
  if (reach.status === 'reachable') return 'ONLINE';
  if (reach.status === 'unreachable') return 'OFFLINE';
  return 'UNKNOWN';
}
