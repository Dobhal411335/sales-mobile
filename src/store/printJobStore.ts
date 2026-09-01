import {create} from 'zustand';
import {
  fetchPrintJob,
  fetchPrintJobs,
  fetchPrinters,
  markPrintJobPrinted,
  printTest,
  retryPrintJob,
} from '../services/printJobService';
import type {
  PrintJob,
  PrintJobDetailData,
  PrintJobEventPayload,
  PrintJobFilter,
  PrinterConfig,
} from '../types/printJob';

interface PrintJobState {
  jobs: PrintJob[];
  selectedJobId: string | null;
  filter: PrintJobFilter;
  printers: PrinterConfig[];
  detail: PrintJobDetailData | null;
  loading: boolean;
  refreshing: boolean;
  detailLoading: boolean;
  actionBusy: boolean;
  error: string | null;
  detailError: string | null;
  actionMessage: string | null;
  listInFlight: boolean;

  fetchList: (options?: {silent?: boolean}) => Promise<void>;
  fetchPrintersList: () => Promise<void>;
  setFilter: (filter: PrintJobFilter) => Promise<void>;
  selectJob: (id: string | null) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  retry: (id: string) => Promise<boolean>;
  markPrinted: (id: string) => Promise<boolean>;
  runPrintTest: (id: string) => Promise<boolean>;
  patchJobFromEvent: (payload: PrintJobEventPayload) => void;
  handleNewJob: () => void;
  clearActionMessage: () => void;
}

export const usePrintJobStore = create<PrintJobState>((set, get) => ({
  jobs: [],
  selectedJobId: null,
  filter: 'ALL',
  printers: [],
  detail: null,
  loading: false,
  refreshing: false,
  detailLoading: false,
  actionBusy: false,
  error: null,
  detailError: null,
  actionMessage: null,
  listInFlight: false,

  fetchList: async (options = {}) => {
    const {silent = false} = options;
    const {filter, listInFlight} = get();
    if (listInFlight) {
      return;
    }

    set({
      listInFlight: true,
      loading: !silent,
      refreshing: silent,
      error: null,
    });

    const response = await fetchPrintJobs({filter});
    if (!response.success || !response.data) {
      set({
        loading: false,
        refreshing: false,
        listInFlight: false,
        error: response.message ?? 'Unable to load print jobs.',
      });
      return;
    }

    set({
      jobs: response.data,
      loading: false,
      refreshing: false,
      listInFlight: false,
      error: null,
    });
  },

  fetchPrintersList: async () => {
    const response = await fetchPrinters();
    if (response.success && response.data) {
      set({printers: response.data});
    }
  },

  setFilter: async (filter) => {
    set({filter, selectedJobId: null, detail: null, detailError: null});
    await get().fetchList();
  },

  selectJob: async (id) => {
    set({selectedJobId: id, detail: null, detailError: null, actionMessage: null});
    if (id) {
      await get().fetchDetail(id);
    }
  },

  fetchDetail: async (id) => {
    set({detailLoading: true, detailError: null});
    const response = await fetchPrintJob(id);
    if (!response.success || !response.data) {
      set({
        detailLoading: false,
        detailError: response.message ?? 'Unable to load print job.',
      });
      return;
    }
    set({
      detail: response.data,
      detailLoading: false,
      detailError: null,
    });
  },

  retry: async (id) => {
    if (get().actionBusy) {
      return false;
    }
    set({actionBusy: true, actionMessage: null});
    const response = await retryPrintJob(id);
    if (!response.success) {
      set({
        actionBusy: false,
        actionMessage: response.message ?? 'Unable to retry this print job. Try again.',
      });
      return false;
    }
    await get().fetchList({silent: true});
    if (get().selectedJobId === id) {
      await get().fetchDetail(id);
    }
    set({
      actionBusy: false,
      actionMessage: response.message ?? 'Retry started',
    });
    return true;
  },

  markPrinted: async (id) => {
    if (get().actionBusy) {
      return false;
    }
    set({actionBusy: true, actionMessage: null});
    const response = await markPrintJobPrinted(id);
    if (!response.success) {
      set({
        actionBusy: false,
        actionMessage:
          response.message ?? 'Unable to mark this print job as printed.',
      });
      return false;
    }
    await get().fetchList({silent: true});
    if (get().selectedJobId === id) {
      await get().fetchDetail(id);
    }
    set({
      actionBusy: false,
      actionMessage: response.message ?? 'Marked printed',
    });
    return true;
  },

  runPrintTest: async (id) => {
    if (get().actionBusy) {
      return false;
    }
    set({actionBusy: true, actionMessage: null});
    const response = await printTest(id);
    if (!response.success) {
      set({
        actionBusy: false,
        actionMessage: response.message ?? 'Print test failed.',
      });
      return false;
    }
    await get().fetchList({silent: true});
    if (get().selectedJobId === id) {
      await get().fetchDetail(id);
    }
    const note =
      response.data?.note ??
      (response.data?.result?.success === false
        ? response.data.result.error ?? 'Simulated failure'
        : 'Mock print finished — no physical printer was contacted.');
    set({
      actionBusy: false,
      actionMessage: note,
    });
    return true;
  },

  patchJobFromEvent: (payload) => {
    const id = payload?.printJobId;
    if (!id) {
      return;
    }
    const {jobs, selectedJobId} = get();
    const index = jobs.findIndex((job) => String(job._id) === String(id));
    if (index === -1) {
      void get().fetchList({silent: true});
      return;
    }
    const next = [...jobs];
    next[index] = {
      ...next[index],
      status: payload.status ?? next[index].status,
      attemptCount: payload.attemptCount ?? next[index].attemptCount,
      errorMessage: payload.errorMessage ?? next[index].errorMessage,
    };
    set({jobs: next});
    if (selectedJobId && String(selectedJobId) === String(id)) {
      void get().fetchDetail(id);
    }
  },

  handleNewJob: () => {
    void get().fetchList({silent: true});
  },

  clearActionMessage: () => set({actionMessage: null}),
}));
