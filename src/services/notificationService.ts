import {config} from '../constants/config';
import {
  getMockNotifications,
  setMockNotifications,
} from '../mocks/notificationMockData';
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
import {api} from './api';

const useLiveApi = Boolean(config.API_BASE_URL);

function mockDelay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function filterMockNotifications(
  items: Notification[],
  filter: NotificationFilter,
): Notification[] {
  if (filter === 'All') {
    return items;
  }
  if (filter === 'Unread') {
    return items.filter((n) => !n.isRead);
  }
  return items.filter((n) => n.category === filter);
}

export function isNotificationApiConfigured(): boolean {
  return useLiveApi;
}

export async function fetchNotifications(params: {
  filter: NotificationFilter;
  page?: number;
  limit?: number;
}): Promise<NotificationsListResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 30;
  const apiFilter = filterToApiParam(params.filter);

  if (!useLiveApi) {
    await mockDelay();
    const all = getMockNotifications();
    const filtered = filterMockNotifications(all, params.filter);
    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);
    const unreadCount = all.filter((n) => !n.isRead).length;
    return {
      success: true,
      data: {
        items: slice,
        total: filtered.length,
        page,
        limit,
        hasMore: start + limit < filtered.length,
        unreadCount,
      },
    };
  }

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
  if (!useLiveApi) {
    await mockDelay(200);
    const unreadCount = getMockNotifications().filter((n) => !n.isRead).length;
    return {success: true, data: {unreadCount}};
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
  if (!useLiveApi) {
    await mockDelay(200);
    const items = getMockNotifications();
    const updated = items.map((n) =>
      n.id === id ? {...n, isRead: true, readAt: new Date().toISOString()} : n,
    );
    setMockNotifications(updated);
    const found = updated.find((n) => n.id === id);
    return found
      ? {success: true, data: found}
      : {success: false, message: 'Notification not found'};
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
  if (!useLiveApi) {
    await mockDelay(300);
    const items = getMockNotifications().map((n) => ({
      ...n,
      isRead: true,
      readAt: n.readAt ?? new Date().toISOString(),
    }));
    setMockNotifications(items);
    return {success: true, data: {modified: items.length}};
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
