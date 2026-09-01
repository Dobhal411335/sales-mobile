import {config} from '../constants/config';
import type {
  EodEmailResponse,
  EodExportKind,
  EodHistoryResponse,
  EodReportResponse,
  EodSaveResponse,
} from '../types/eod';
import {api} from './api';
import {buildMockEodReport, MOCK_EOD_HISTORY} from './eodMockData';

const useLiveApi = Boolean(config.API_BASE_URL);

function mockDelay(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapApiError(status?: number): string {
  if (status === 403) {
    return "You don't have permission to access this report.";
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  return 'Unable to complete this action. Try again.';
}

export function isEodApiConfigured(): boolean {
  return useLiveApi;
}

export async function fetchEodReport(
  date: string,
  preferLive: boolean,
): Promise<EodReportResponse> {
  if (!useLiveApi) {
    await mockDelay();
    const report = buildMockEodReport(date);
    const isToday = date === report.meta.businessDate;
    return {
      success: true,
      data: {
        report,
        saved: !preferLive && !isToday,
        businessDate: date,
      },
    };
  }

  try {
    const qs = new URLSearchParams({
      date,
      preferSaved: preferLive ? '0' : '1',
    });
    const res = await api.get<EodReportResponse>(`/api/eod?${qs}`);
    if (!res.data.success || !res.data.data) {
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

export async function saveEodReport(
  date: string,
  actualDeposit: number | null,
): Promise<EodSaveResponse> {
  if (!useLiveApi) {
    await mockDelay(700);
    const report = buildMockEodReport(date);
    report.meta.source = 'saved';
    if (actualDeposit != null) {
      report.cashDeposit.actualDeposit = actualDeposit;
      report.cashDeposit.overShort = actualDeposit - report.cashDeposit.expectedDeposit;
    }
    return {
      success: true,
      data: {
        id: 'mock-saved',
        businessDate: date,
        report,
        reconciliation: report.reconciliation,
      },
    };
  }

  try {
    const res = await api.post<EodSaveResponse>('/api/eod/save', {
      date,
      actualDeposit,
    });
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

export async function fetchEodHistory(limit = 60): Promise<EodHistoryResponse> {
  if (!useLiveApi) {
    await mockDelay(300);
    return {success: true, data: {history: MOCK_EOD_HISTORY}};
  }

  try {
    const res = await api.get<EodHistoryResponse>('/api/eod/history', {
      params: {limit},
    });
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

export async function downloadEodExport(
  kind: EodExportKind,
  date: string,
  preferLive: boolean,
): Promise<{success: boolean; message?: string; data?: Blob; filename?: string}> {
  if (!useLiveApi) {
    return {
      success: false,
      message: 'Export requires backend connection.',
    };
  }

  try {
    const qs = new URLSearchParams({
      date,
      preferSaved: preferLive ? '0' : '1',
    });
    const res = await api.get(`/api/eod/${kind}?${qs}`, {
      responseType: 'blob',
    });
    const ext = kind === 'excel' ? 'xlsx' : 'pdf';
    return {
      success: true,
      data: res.data as Blob,
      filename: `End-of-Day-${date}.${ext}`,
    };
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {success: false, message: mapApiError(status)};
  }
}

export async function emailEodReport(
  date: string,
  to: string,
  preferSaved = true,
): Promise<EodEmailResponse> {
  if (!useLiveApi) {
    return {
      success: false,
      message: 'Email requires backend connection.',
    };
  }

  try {
    const res = await api.post<EodEmailResponse>('/api/eod/email', {
      date,
      to,
      preferSaved,
    });
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
