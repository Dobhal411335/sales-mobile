import {create} from 'zustand';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import {
  getSoundEnabled,
  playNotificationSound,
  setSoundEnabled,
} from '../services/notificationSoundService';
import type {
  Notification,
  NotificationFilter,
} from '../types/notification';
import {categorizeNotificationType} from '../types/notification';

const PREVIEW_LIMIT = 40;
const PAGE_LIMIT = 30;
const MAX_PREVIEW_ITEMS = 50;

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  filter: NotificationFilter;
  soundEnabled: boolean;
  soundPlaybackAvailable: boolean;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  markingAllRead: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  seenIds: Set<string>;
  initialized: boolean;

  initialize: () => Promise<void>;
  fetchList: (options?: {
    append?: boolean;
    silent?: boolean;
    limit?: number;
  }) => Promise<void>;
  refreshPreview: () => Promise<void>;
  setFilter: (filter: NotificationFilter) => Promise<void>;
  toggleSound: () => Promise<boolean>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<boolean>;
  handleIncoming: (
    incoming: Notification,
    options?: {playSound?: boolean},
  ) => void;
  handleReadEvent: (id: string) => void;
  handleReadAllEvent: () => void;
}

function normalizeIncoming(raw: Notification): Notification {
  const id = String(raw.id || raw._id);
  return {
    ...raw,
    id,
    category: raw.category ?? categorizeNotificationType(raw.type),
    isRead: Boolean(raw.isRead),
  };
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  filter: 'All',
  soundEnabled: true,
  soundPlaybackAvailable: false,
  loading: false,
  refreshing: false,
  loadingMore: false,
  markingAllRead: false,
  error: null,
  page: 1,
  hasMore: false,
  seenIds: new Set<string>(),
  initialized: false,

  initialize: async () => {
    const soundOn = await getSoundEnabled();
    const {isSoundPlaybackAvailable: checkPlayback} = await import(
      '../services/notificationSoundService'
    );
    set({
      soundEnabled: soundOn,
      soundPlaybackAvailable: checkPlayback(),
      initialized: true,
    });
    await get().fetchList({silent: false});
  },

  fetchList: async (options = {}) => {
    const {append = false, silent = false, limit = PAGE_LIMIT} = options;
    const {filter, page: currentPage, notifications} = get();
    const page = append ? currentPage + 1 : 1;

    if (append) {
      set({loadingMore: true, error: null});
    } else if (silent) {
      set({refreshing: true, error: null});
    } else {
      set({loading: true, error: null});
    }

    const response = await fetchNotifications({filter, page, limit});

    if (!response.success || !response.data) {
      set({
        loading: false,
        refreshing: false,
        loadingMore: false,
        error: response.message ?? 'Unable to load notifications.',
      });
      return;
    }

    const items = response.data.items.map(normalizeIncoming);
    const seenIds = new Set(get().seenIds);
    items.forEach((n) => seenIds.add(n.id));

    set({
      notifications: append ? [...notifications, ...items] : items,
      unreadCount: response.data.unreadCount,
      page: response.data.page,
      hasMore: response.data.hasMore,
      seenIds,
      loading: false,
      refreshing: false,
      loadingMore: false,
      error: null,
    });
  },

  refreshPreview: async () => {
    const response = await fetchNotifications({
      filter: 'All',
      page: 1,
      limit: PREVIEW_LIMIT,
    });

    if (!response.success || !response.data) {
      return;
    }

    const items = response.data.items.map(normalizeIncoming);
    const seenIds = new Set(get().seenIds);
    items.forEach((n) => seenIds.add(n.id));

    set({
      notifications: items.slice(0, MAX_PREVIEW_ITEMS),
      unreadCount: response.data.unreadCount,
      seenIds,
    });
  },

  setFilter: async (filter) => {
    set({filter, page: 1});
    await get().fetchList({append: false, silent: false});
  },

  toggleSound: async () => {
    const next = !get().soundEnabled;
    await setSoundEnabled(next);
    const {playPreviewBell, isSoundPlaybackAvailable: checkPlayback} =
      await import('../services/notificationSoundService');
    let playbackAvailable = checkPlayback();
    if (next) {
      playbackAvailable = await playPreviewBell();
    }
    set({
      soundEnabled: next,
      soundPlaybackAvailable: playbackAvailable,
    });
    return playbackAvailable;
  },

  markRead: async (id) => {
    const existing = get().notifications.find((n) => n.id === id);
    if (!existing) {
      await markNotificationRead(id);
      return;
    }

    if (!existing.isRead) {
      set({
        notifications: get().notifications.map((n) =>
          n.id === id ? {...n, isRead: true} : n,
        ),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
      await markNotificationRead(id);
      return;
    }

    await markNotificationRead(id);
  },

  markAllRead: async () => {
    if (get().markingAllRead) {
      return false;
    }
    set({markingAllRead: true});
    const response = await markAllNotificationsRead();
    if (response.success) {
      set({
        notifications: get().notifications.map((n) => ({...n, isRead: true})),
        unreadCount: 0,
        markingAllRead: false,
      });
      return true;
    }
    set({markingAllRead: false});
    return false;
  },

  handleIncoming: (incoming, options = {}) => {
    const {playSound = true} = options;
    const normalized = normalizeIncoming(incoming);
    const {seenIds, notifications} = get();

    if (seenIds.has(normalized.id)) {
      return;
    }

    const nextSeen = new Set(seenIds);
    nextSeen.add(normalized.id);

    const exists = notifications.some((n) => n.id === normalized.id);
    const nextNotifications = exists
      ? notifications
      : [{...normalized, isRead: false}, ...notifications].slice(
          0,
          MAX_PREVIEW_ITEMS,
        );

    set({
      notifications: nextNotifications,
      seenIds: nextSeen,
      unreadCount: normalized.isRead
        ? get().unreadCount
        : get().unreadCount + 1,
    });

    if (playSound && !normalized.isRead) {
      void playNotificationSound(normalized);
    }
  },

  handleReadEvent: (id) => {
    const target = get().notifications.find((n) => n.id === id);
    if (!target || target.isRead) {
      return;
    }
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? {...n, isRead: true} : n,
      ),
      unreadCount: Math.max(0, get().unreadCount - 1),
    });
  },

  handleReadAllEvent: () => {
    set({
      notifications: get().notifications.map((n) => ({...n, isRead: true})),
      unreadCount: 0,
    });
  },
}));
