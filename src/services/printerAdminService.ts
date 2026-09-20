import type {PrinterConfig, PrinterTarget} from '../types/printJob';
import {getApiNotConfiguredMessage, isApiConfigured} from '../utils/apiGuard';
import {api} from './api';

export interface PrinterUpsertPayload {
  name: string;
  target: PrinterTarget;
  purpose?: PrinterTarget;
  connectionType?: 'NETWORK' | 'LAN' | 'USB';
  host?: string | null;
  ipAddress?: string | null;
  port?: number | null;
  location?: 'COUNTER' | 'KITCHEN' | 'BAR' | null;
  type?: string;
  enabled?: boolean;
  isActive?: boolean;
  systemPrinterName?: string | null;
}

function mapApiError(status?: number, fallback = 'Unable to manage printers.'): string {
  if (status === 403) {
    return 'Printer setup requires Admin or Manager access.';
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 409) {
    return 'A printer for this purpose already exists. Edit the existing one.';
  }
  return fallback;
}

export async function fetchAdminPrinters(): Promise<{
  success: boolean;
  data?: PrinterConfig[];
  message?: string;
}> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }
  try {
    const res = await api.get<{success: boolean; data?: PrinterConfig[]; message?: string}>(
      '/api/admin/printers',
    );
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status),
      };
    }
    return {success: true, data: res.data.data || []};
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {success: false, message: mapApiError(status)};
  }
}

export async function createAdminPrinter(
  payload: PrinterUpsertPayload,
): Promise<{success: boolean; data?: PrinterConfig; message?: string}> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }
  try {
    const res = await api.post<{success: boolean; data?: PrinterConfig; message?: string}>(
      '/api/admin/printers',
      payload,
    );
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status, 'Failed to create printer.'),
      };
    }
    return {success: true, data: res.data.data, message: res.data.message};
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    const serverMessage = (err as {response?: {data?: {message?: string}}})?.response
      ?.data?.message;
    return {
      success: false,
      message: serverMessage ?? mapApiError(status, 'Failed to create printer.'),
    };
  }
}

export async function updateAdminPrinter(
  id: string,
  payload: PrinterUpsertPayload,
): Promise<{success: boolean; data?: PrinterConfig; message?: string}> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }
  try {
    const res = await api.patch<{success: boolean; data?: PrinterConfig; message?: string}>(
      `/api/admin/printers/${id}`,
      payload,
    );
    if (!res.data.success) {
      return {
        success: false,
        message:
          res.data.message ?? mapApiError(res.status, 'Failed to update printer.'),
      };
    }
    return {success: true, data: res.data.data, message: res.data.message};
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    const serverMessage = (err as {response?: {data?: {message?: string}}})?.response
      ?.data?.message;
    return {
      success: false,
      message: serverMessage ?? mapApiError(status, 'Failed to update printer.'),
    };
  }
}

export async function deleteAdminPrinter(
  id: string,
): Promise<{success: boolean; message?: string}> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }
  try {
    const res = await api.delete<{success: boolean; message?: string}>(
      `/api/admin/printers/${id}`,
    );
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status, 'Failed to remove printer.'),
      };
    }
    return {success: true, message: res.data.message};
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {
      success: false,
      message: mapApiError(status, 'Failed to remove printer.'),
    };
  }
}

export async function requestPrinterProbe(
  id: string,
): Promise<{success: boolean; message?: string; requestId?: string}> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }
  try {
    const res = await api.post<{
      success: boolean;
      message?: string;
      data?: {requestId?: string};
    }>(`/api/admin/printers/${id}/probe`, {});
    return {
      success: !!res.data.success,
      message: res.data.message,
      requestId: res.data.data?.requestId,
    };
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {
      success: false,
      message: mapApiError(status, 'Failed to start connection check.'),
    };
  }
}

export async function requestPrinterTest(
  id: string,
): Promise<{success: boolean; message?: string}> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }
  try {
    const res = await api.post<{success: boolean; message?: string}>(
      `/api/admin/printers/${id}/test`,
      {},
    );
    return {
      success: !!res.data.success,
      message: res.data.message,
    };
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {
      success: false,
      message: mapApiError(status, 'Failed to send test print.'),
    };
  }
}
