import {config} from '../constants/config';
import {
  getMockDayCloseBlockers,
  type MockDayCloseScenario,
} from '../mocks/dayCloseMockData';
import type {
  DayCloseBlockers,
  DayCloseResultResponse,
  DayCloseValidationResponse,
} from '../types/dayClose';
import {api} from './api';

const useLiveApi = Boolean(config.API_BASE_URL);

function mockDelay(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapApiError(status?: number, fallback?: string): string {
  if (status === 403) {
    return "You don't have permission to close the restaurant.";
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  return fallback ?? 'Unable to complete this action. Try again.';
}

function normalizeBlockers(raw?: DayCloseBlockers | null): DayCloseBlockers {
  return {
    pendingOrders: raw?.pendingOrders ?? [],
    bookedTables: raw?.bookedTables ?? [],
    pendingOrderCount: raw?.pendingOrderCount ?? 0,
    bookedTableCount: raw?.bookedTableCount ?? 0,
    canClose: Boolean(raw?.canClose),
  };
}

export function isDayCloseApiConfigured(): boolean {
  return useLiveApi;
}

export async function validateDayClose(): Promise<DayCloseValidationResponse> {
  if (!useLiveApi) {
    await mockDelay();
    return {
      success: true,
      message: 'Mock validation',
      data: getMockDayCloseBlockers(),
    };
  }

  try {
    const res = await api.get<DayCloseValidationResponse>(
      '/api/employees/close-restaurant',
    );
    if (!res.data.success || !res.data.data) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status),
      };
    }
    return {
      success: true,
      message: res.data.message,
      data: normalizeBlockers(res.data.data),
    };
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'response' in error
        ? (error as {response?: {status?: number}}).response?.status
        : undefined;
    return {
      success: false,
      message: mapApiError(status, 'Unable to check restaurant status.'),
    };
  }
}

export async function closeRestaurant(): Promise<DayCloseResultResponse> {
  if (!useLiveApi) {
    await mockDelay(800);
    return {
      success: false,
      message:
        'Restaurant close requires a connected backend. Set API_BASE_URL to continue.',
    };
  }

  try {
    const res = await api.post<DayCloseResultResponse>(
      '/api/employees/close-restaurant',
    );
    if (res.data.success) {
      return {
        success: true,
        message:
          res.data.message ?? 'Restaurant closed. All employees logged out.',
        data: res.data.data,
      };
    }

    if (res.status === 409 || res.data.code === 'CLOSE_BLOCKED') {
      return {
        success: false,
        code: 'CLOSE_BLOCKED',
        message:
          res.data.message ??
          'Clear pending orders and booked tables before day close.',
        data: normalizeBlockers(res.data.data),
      };
    }

    return {
      success: false,
      message: res.data.message ?? mapApiError(res.status),
    };
  } catch (error: unknown) {
    const response =
      error && typeof error === 'object' && 'response' in error
        ? (error as {
            response?: {status?: number; data?: DayCloseResultResponse};
          }).response
        : undefined;

    if (response?.status === 409 || response?.data?.code === 'CLOSE_BLOCKED') {
      return {
        success: false,
        code: 'CLOSE_BLOCKED',
        message:
          response.data?.message ??
          'Clear pending orders and booked tables before day close.',
        data: normalizeBlockers(response.data?.data),
      };
    }

    return {
      success: false,
      message: mapApiError(
        response?.status,
        'Unable to close restaurant. Please try again.',
      ),
    };
  }
}

/** Dev-only helper to preview the ready state without a backend. */
export function getMockScenarioBlockers(
  scenario: MockDayCloseScenario,
): DayCloseBlockers {
  return getMockDayCloseBlockers(scenario);
}
