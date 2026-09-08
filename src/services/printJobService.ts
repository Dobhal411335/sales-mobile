import type {
  FetchPrintJobsParams,
  PrintJob,
  PrintJobActionResponse,
  PrintJobDetailResponse,
  PrintJobTestResponse,
  PrintersListResponse,
  PrintJobsListResponse,
} from '../types/printJob';
import {filterToApiStatus} from '../types/printJob';
import {getApiNotConfiguredMessage, isApiConfigured} from '../utils/apiGuard';
import {api} from './api';

function mapApiError(status?: number, fallback = 'Unable to load print jobs.'): string {
  if (status === 403) {
    return "You don't have permission to view print jobs.";
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  return fallback;
}

function normalizePrintJob(raw: PrintJob): PrintJob {
  return {
    ...raw,
    _id: String(raw._id),
  };
}

export function isPrintJobApiConfigured(): boolean {
  return isApiConfigured();
}

export async function fetchPrintJobs(
  params: FetchPrintJobsParams = {},
): Promise<PrintJobsListResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  const limit = params.limit ?? 25;

  try {
    const qs = new URLSearchParams();

    const status = params.status
      ? (params.status !== 'ALL' ? params.status : undefined)
      : params.filter
      ? filterToApiStatus(params.filter)
      : undefined;

    if (status) {
      qs.set('status', status);
    }
    if (params.printType && params.printType !== 'ALL') {
      qs.set('printType', params.printType);
    }
    if (params.printerTarget && params.printerTarget !== 'ALL') {
      qs.set('printerTarget', params.printerTarget);
    }
    if (params.reprint) {
      qs.set('reprint', 'true');
    }
    if (params.search && params.search.trim()) {
      qs.set('search', params.search.trim());
    }
    if (params.page) {
      qs.set('page', String(params.page));
    }
    qs.set('limit', String(limit));

    const query = qs.toString();
    const res = await api.get<PrintJobsListResponse>(
      `/api/sales/print-jobs${query ? `?${query}` : ''}`,
    );
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status),
      };
    }
    return {
      success: true,
      data: (res.data.data || []).map(normalizePrintJob),
      stats: res.data.stats,
      pagination: res.data.pagination,
    };
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {success: false, message: mapApiError(status)};
  }
}

export async function reprintJob(id: string): Promise<ReprintTicketResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  const idempotencyKey = `reprint:${id}:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const res = await api.post<ReprintTicketResponse>(
      `/api/sales/print-jobs/${id}/reprint`,
      {idempotencyKey},
    );
    if (!res.data.success) {
      return {
        success: false,
        message:
          res.data.message ??
          mapApiError(res.status, 'Failed to reprint print job.'),
      };
    }
    return res.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    const serverMessage = (err as {
      response?: {data?: {message?: string}};
    })?.response?.data?.message;
    return {
      success: false,
      message:
        serverMessage ??
        mapApiError(status, 'Failed to reprint print job.'),
    };
  }
}

export async function fetchPrintJob(id: string): Promise<PrintJobDetailResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.get<PrintJobDetailResponse>(
      `/api/sales/print-jobs/${id}`,
    );
    if (!res.data.success || !res.data.data) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status, 'Unable to load print job.'),
      };
    }
    return {
      success: true,
      data: {
        ...res.data.data,
        job: normalizePrintJob(res.data.data.job),
      },
    };
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {
      success: false,
      message: mapApiError(status, 'Unable to load print job.'),
    };
  }
}

export async function retryPrintJob(id: string): Promise<PrintJobActionResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.patch<PrintJobActionResponse>(
      `/api/sales/print-jobs/${id}`,
      {action: 'retry'},
    );
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? 'Unable to retry this print job.',
      };
    }
    return res.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {
      success: false,
      message: mapApiError(status, 'Unable to retry this print job.'),
    };
  }
}

export async function markPrintJobPrinted(
  id: string,
): Promise<PrintJobActionResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.patch<PrintJobActionResponse>(
      `/api/sales/print-jobs/${id}`,
      {action: 'mark_printed'},
    );
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? 'Unable to mark this print job as printed.',
      };
    }
    return res.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {
      success: false,
      message: mapApiError(status, 'Unable to mark this print job as printed.'),
    };
  }
}

export async function printTest(
  id: string,
  simulateFailure = false,
): Promise<PrintJobTestResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.post<PrintJobTestResponse>(
      `/api/sales/print-jobs/${id}/print-test`,
      {simulateFailure},
    );
    if (!res.data.success && res.data.data?.result?.success === false) {
      return {
        success: true,
        data: res.data.data,
        message: res.data.data.result.error ?? 'Simulated failure',
      };
    }
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? 'Print test failed.',
      };
    }
    return res.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {
      success: false,
      message: mapApiError(status, 'Print test failed.'),
    };
  }
}

export async function claimPrintJob(
  id: string,
): Promise<{ success: boolean; claimed: boolean; message?: string }> {
  if (!isApiConfigured()) {
    return { success: false, claimed: false, message: getApiNotConfiguredMessage() };
  }
  try {
    const res = await api.patch<{ success: boolean; data?: { claimed: boolean }; message?: string }>(
      `/api/sales/print-jobs/${id}`,
      { action: 'claim' },
    );
    return {
      success: !!res.data.success,
      claimed: !!res.data.data?.claimed,
      message: res.data.message,
    };
  } catch {
    return { success: false, claimed: false };
  }
}

export async function fetchPrinters(): Promise<PrintersListResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.get<PrintersListResponse>('/api/sales/printers');
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status),
      };
    }
    return res.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {success: false, message: mapApiError(status)};
  }
}

export interface CompletePrintJobResponse {
  success: boolean;
  data?: PrintJob;
  message?: string;
}

export interface ReprintTicketParams {
  jobId?: string;
  orderId?: string;
  printType: 'customer' | 'kot' | 'bar' | 'RECEIPT' | 'KOT' | 'BAR_RECEIPT';
  kotItems?: unknown[];
  guestCount?: number;
  serverName?: string;
  specialNote?: string;
  restaurantName?: string;
  idempotencyKey?: string;
}

export interface ReprintTicketResponse {
  success: boolean;
  data?: {
    job: PrintJob;
    created: boolean;
  };
  message?: string;
}

export async function reprintTicket(
  params: ReprintTicketParams,
): Promise<ReprintTicketResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.post<ReprintTicketResponse>(
      '/api/sales/print-jobs/reprint-ticket',
      params,
    );
    if (!res.data.success) {
      return {
        success: false,
        message:
          res.data.message ??
          mapApiError(res.status, 'Failed to reprint ticket.'),
      };
    }
    return res.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    const serverMessage = (err as {
      response?: {data?: {message?: string}};
    })?.response?.data?.message;
    return {
      success: false,
      message: serverMessage ?? mapApiError(status, 'Failed to reprint ticket.'),
    };
  }
}

export async function completePrintJob(
  id: string,
  success: boolean,
  errorMessage?: string,
): Promise<CompletePrintJobResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.post<CompletePrintJobResponse>(
      `/api/sales/print-jobs/${id}/complete`,
      {
        success: !!success,
        errorMessage: errorMessage || undefined,
      },
    );
    if (!res.data.success) {
      return {
        success: false,
        message:
          res.data.message ??
          mapApiError(res.status, 'Unable to complete print job.'),
      };
    }
    return res.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {
      success: false,
      message: mapApiError(status, 'Unable to complete print job.'),
    };
  }
}
