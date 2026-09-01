import {config} from '../constants/config';
import {
  getMockPrintJobDetail,
  getMockPrintJobs,
  getMockPrinters,
  updateMockPrintJob,
} from '../mocks/printJobMockData';
import type {
  PrintJob,
  PrintJobActionResponse,
  PrintJobDetailResponse,
  PrintJobFilter,
  PrintJobTestResponse,
  PrintersListResponse,
  PrintJobsListResponse,
} from '../types/printJob';
import {filterToApiStatus} from '../types/printJob';
import {api} from './api';

const useLiveApi = Boolean(config.API_BASE_URL);

function mockDelay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  return useLiveApi;
}

export async function fetchPrintJobs(params: {
  filter?: PrintJobFilter;
  limit?: number;
}): Promise<PrintJobsListResponse> {
  const filter = params.filter ?? 'ALL';
  const limit = params.limit ?? 50;

  if (!useLiveApi) {
    await mockDelay();
    return {
      success: true,
      data: getMockPrintJobs(filter).map(normalizePrintJob),
    };
  }

  try {
    const qs = new URLSearchParams();
    const status = filterToApiStatus(filter);
    if (status) {
      qs.set('status', status);
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
    };
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {success: false, message: mapApiError(status)};
  }
}

export async function fetchPrintJob(id: string): Promise<PrintJobDetailResponse> {
  if (!useLiveApi) {
    await mockDelay();
    const data = getMockPrintJobDetail(id);
    if (!data) {
      return {success: false, message: 'Print job not found.'};
    }
    return {
      success: true,
      data: {
        ...data,
        job: normalizePrintJob(data.job),
      },
    };
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
  if (!useLiveApi) {
    await mockDelay(600);
    const updated = updateMockPrintJob(id, {
      status: 'QUEUED',
      errorMessage: null,
      attemptCount: (getMockPrintJobDetail(id)?.job.attemptCount ?? 0),
    });
    if (!updated) {
      return {success: false, message: 'Print job not found.'};
    }
    updateMockPrintJob(id, {status: 'PRINTED', attemptCount: (updated.attemptCount ?? 0) + 1});
    return {
      success: true,
      message: 'Retry started (mock adapter)',
      data: {job: getMockPrintJobDetail(id)?.job},
    };
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
  if (!useLiveApi) {
    await mockDelay(300);
    const updated = updateMockPrintJob(id, {
      status: 'PRINTED',
      errorMessage: null,
      attemptCount: Math.max(getMockPrintJobDetail(id)?.job.attemptCount ?? 0, 1),
    });
    if (!updated) {
      return {success: false, message: 'Print job not found.'};
    }
    return {
      success: true,
      message: 'Marked printed',
      data: {job: updated},
    };
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
  if (!useLiveApi) {
    await mockDelay(800);
    const detail = getMockPrintJobDetail(id);
    if (!detail) {
      return {success: false, message: 'Print job not found.'};
    }
    if (simulateFailure) {
      updateMockPrintJob(id, {
        status: 'FAILED',
        errorMessage: 'Simulated print failure (MockPrinterAdapter)',
        attemptCount: (detail.job.attemptCount ?? 0) + 1,
      });
      return {
        success: true,
        message: 'Print test failed (simulated)',
        data: {
          job: getMockPrintJobDetail(id)!.job,
          result: {
            success: false,
            error: 'Simulated print failure (MockPrinterAdapter)',
            adapter: 'MockPrinterAdapter',
          },
        },
      };
    }
    updateMockPrintJob(id, {
      status: 'PRINTED',
      errorMessage: null,
      attemptCount: (detail.job.attemptCount ?? 0) + 1,
    });
    return {
      success: true,
      message: 'Print test completed (simulated)',
      data: {
        job: getMockPrintJobDetail(id)!.job,
        result: {
          success: true,
          adapter: 'MockPrinterAdapter',
          simulated: true,
        },
        note: 'Mock print finished — no physical printer was contacted.',
      },
    };
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

export async function fetchPrinters(): Promise<PrintersListResponse> {
  if (!useLiveApi) {
    await mockDelay(200);
    return {success: true, data: getMockPrinters()};
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
