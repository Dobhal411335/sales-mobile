import type {
  MarkAllReadResponse,
  MarkReadResponse,
  Notification,
  NotificationFilter,
  NotificationsListResponse,
  UnreadCountResponse,
} from '../types/notification';
import {
  categorizeNotificationType,
  filterToApiParam,
} from '../types/notification';
import {getApiNotConfiguredMessage, isApiConfigured} from '../utils/apiGuard';
import {api} from './api';

function mapApiError(status?: number): string {
  if (status === 403) {
    return "You don't have permission to view notifications.";
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  return 'Unable to load notifications.';
}

function normalizeNotification(raw: Notification): Notification {
  return {
    ...raw,
    id: String(raw.id || raw._id),
    category: raw.category ?? categorizeNotificationType(raw.type),
    isRead: Boolean(raw.isRead),
  };
}

export function isNotificationApiConfigured(): boolean {
  return isApiConfigured();
}

export async function fetchNotifications(params: {
  filter: NotificationFilter;
  page?: number;
  limit?: number;
}): Promise<NotificationsListResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 30;
  const apiFilter = filterToApiParam(params.filter);

  try {
    const qs = new URLSearchParams({
      filter: apiFilter,
      page: String(page),
      limit: String(limit),
    });
    const res = await api.get<NotificationsListResponse>(
      `/api/sales/notifications?${qs}`,
    );
    if (!res.data.success || !res.data.data) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status),
      };
    }
    return {
      success: true,
      data: {
        ...res.data.data,
        items: (res.data.data.items || []).map(normalizeNotification),
      },
    };
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {success: false, message: mapApiError(status)};
  }
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.get<UnreadCountResponse>(
      '/api/sales/notifications?unreadOnly=true',
    );
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

export async function markNotificationRead(
  id: string,
): Promise<MarkReadResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.patch<MarkReadResponse>(
      `/api/sales/notifications/${id}`,
    );
    if (!res.data.success) {
      return {
        success: false,
        message: res.data.message ?? mapApiError(res.status),
      };
    }
    if (res.data.data) {
      res.data.data = normalizeNotification(res.data.data);
    }
    return res.data;
  } catch (err: unknown) {
    const status = (err as {response?: {status?: number}})?.response?.status;
    return {success: false, message: mapApiError(status)};
  }
}

export async function markAllNotificationsRead(): Promise<MarkAllReadResponse> {
  if (!isApiConfigured()) {
    return {success: false, message: getApiNotConfiguredMessage()};
  }

  try {
    const res = await api.patch<MarkAllReadResponse>(
      '/api/sales/notifications',
      {action: 'read_all'},
    );
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
