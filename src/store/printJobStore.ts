import {create} from 'zustand';
import {
  fetchPrintJob,
  fetchPrintJobs,
  fetchPrinters,
  markPrintJobPrinted,
  printTest,
  reprintJob,
  retryPrintJob,
} from '../services/printJobService';
import type {
  PrintJob,
  PrintJobDetailData,
  PrintJobEventPayload,
  PrintJobFilter,
  PrintJobPagination,
  PrintJobStats,
  PrinterConfig,
} from '../types/printJob';

interface PrintJobState {
  jobs: PrintJob[];
  selectedJobId: string | null;
  filter: PrintJobFilter;
  statusFilter: string;
  typeFilter: string;
  targetFilter: string;
  reprintOnly: boolean;
  searchQuery: string;
  page: number;
  pagination: PrintJobPagination | null;
  serverStats: PrintJobStats | null;
  printers: PrinterConfig[];
  detail: PrintJobDetailData | null;
  loading: boolean;
  refreshing: boolean;
  detailLoading: boolean;
  actionBusy: boolean;
  reprinting: boolean;
  error: string | null;
  detailError: string | null;
  actionMessage: string | null;
  listInFlight: boolean;

  fetchList: (options?: {silent?: boolean}) => Promise<void>;
  fetchPrintersList: () => Promise<void>;
  setFilter: (filter: PrintJobFilter) => Promise<void>;
  setStatusFilter: (status: string) => Promise<void>;
  setTypeFilter: (type: string) => Promise<void>;
  setTargetFilter: (target: string) => Promise<void>;
  setReprintOnly: (reprintOnly: boolean) => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  setPage: (page: number) => Promise<void>;
  resetFilters: () => Promise<void>;
  selectJob: (id: string | null) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  retry: (id: string) => Promise<boolean>;
  reprint: (id: string) => Promise<{success: boolean; job?: PrintJob}>;
  markPrinted: (id: string) => Promise<boolean>;
  runPrintTest: (id: string) => Promise<boolean>;
  patchJobFromEvent: (payload: PrintJobEventPayload) => void;
  handleNewJob: () => void;
  clearActionMessage: () => void;
}

const VALID_STATUS_FILTERS = ['ALL', 'QUEUED', 'PRINTING', 'PRINTED', 'FAILED'] as const;

export const usePrintJobStore = create<PrintJobState>((set, get) => ({
  jobs: [],
  selectedJobId: null,
  filter: 'ALL',
  statusFilter: 'ALL',
  typeFilter: 'ALL',
  targetFilter: 'ALL',
  reprintOnly: false,
  searchQuery: '',
  page: 1,
  pagination: null,
  serverStats: null,
  printers: [],
  detail: null,
  loading: false,
  refreshing: false,
  detailLoading: false,
  actionBusy: false,
  reprinting: false,
  error: null,
  detailError: null,
  actionMessage: null,
  listInFlight: false,

  fetchList: async (options = {}) => {
    const {silent = false} = options;
    const {
      statusFilter,
      typeFilter,
      targetFilter,
      reprintOnly,
      searchQuery,
      page,
      listInFlight,
    } = get();

    if (listInFlight) {
      return;
    }

    set({
      listInFlight: true,
      loading: !silent,
      refreshing: silent,
      error: null,
    });

    const response = await fetchPrintJobs({
      status: statusFilter,
      printType: typeFilter,
      printerTarget: targetFilter,
      reprint: reprintOnly,
      search: searchQuery,
      page,
      limit: 25,
    });

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
      serverStats: response.stats ?? null,
      pagination: response.pagination ?? null,
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
    set({
      filter,
      statusFilter: filter,
      reprintOnly: false,
      page: 1,
      selectedJobId: null,
      detail: null,
      detailError: null,
    });
    await get().fetchList();
  },

  setStatusFilter: async (statusFilter) => {
    const isPrintJobFilter = (s: string): s is PrintJobFilter =>
      (VALID_STATUS_FILTERS as readonly string[]).includes(s);

    set({
      statusFilter,
      filter: isPrintJobFilter(statusFilter) ? statusFilter : 'ALL',
      reprintOnly: false,
      page: 1,
    });
    await get().fetchList();
  },

  setTypeFilter: async (typeFilter) => {
    set({
      typeFilter,
      reprintOnly: false,
      page: 1,
    });
    await get().fetchList();
  },

  setTargetFilter: async (targetFilter) => {
    set({
      targetFilter,
      page: 1,
    });
    await get().fetchList();
  },

  setReprintOnly: async (reprintOnly) => {
    set({
      reprintOnly,
      statusFilter: 'ALL',
      typeFilter: 'ALL',
      filter: 'ALL',
      page: 1,
    });
    await get().fetchList();
  },

  setSearchQuery: async (searchQuery) => {
    set({
      searchQuery,
      page: 1,
    });
    await get().fetchList();
  },

  setPage: async (page) => {
    set({page});
    await get().fetchList();
  },

  resetFilters: async () => {
    set({
      statusFilter: 'ALL',
      typeFilter: 'ALL',
      targetFilter: 'ALL',
      filter: 'ALL',
      reprintOnly: false,
      searchQuery: '',
      page: 1,
    });
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
      actionMessage: response.message ?? 'Print job requeued.',
    });
    return true;
  },

  reprint: async (id) => {
    if (get().reprinting || get().actionBusy) {
      return {success: false};
    }
    set({reprinting: true, actionMessage: null});
    const response = await reprintJob(id);
    if (!response.success || !response.data?.job) {
      set({
        reprinting: false,
        actionMessage: response.message ?? 'Failed to print again.',
      });
      return {success: false};
    }

    const newJob = response.data.job;
    await get().fetchList({silent: true});
    await get().selectJob(newJob._id);
    set({
      reprinting: false,
      actionMessage: 'Print job queued.',
    });
    return {success: true, job: newJob};
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
      get().fetchList({silent: true});
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
      get().fetchDetail(id);
    }
  },

  handleNewJob: () => {
    get().fetchList({silent: true});
  },

  clearActionMessage: () => set({actionMessage: null}),
}));
