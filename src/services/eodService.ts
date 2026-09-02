import type {
  EodEmailResponse,
  EodExportKind,
  EodHistoryResponse,
  EodReportResponse,
  EodSaveResponse,
} from '../types/eod';
import {getApiNotConfiguredMessage, isApiConfigured} from '../utils/apiGuard';
import {api} from './api';

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
  return isApiConfigured();
}

export async function fetchEodReport(
  date: string,
  preferLive: boolean,
): Promise<EodReportResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
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
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
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
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
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
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
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
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
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
