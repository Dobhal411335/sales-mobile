import {useEffect} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {io, type Socket} from 'socket.io-client';
import {config} from '../constants/config';
import {initNotificationSound} from '../services/notificationSoundService';
import {useAuthStore} from '../store/authStore';
import {useNotificationStore} from '../store/notificationStore';
import {usePrintJobStore} from '../store/printJobStore';
import type {Notification} from '../types/notification';
import type {PrintJobEventPayload} from '../types/printJob';
import {buildCookieHeader} from '../utils/secureStorage';

let socketInstance: Socket | null = null;
let coreListenersAttached = false;
let hadDisconnect = false;

async function createSocket(): Promise<Socket | null> {
  if (!config.API_BASE_URL) {
    return null;
  }

  const cookie = await buildCookieHeader();
  const socket = io(config.API_BASE_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    extraHeaders: cookie ? {Cookie: cookie} : undefined,
  });

  socket.io.on('reconnect_attempt', async () => {
    try {
      const freshCookie = await buildCookieHeader();
      if (freshCookie && socket.io.opts.extraHeaders) {
        socket.io.opts.extraHeaders.Cookie = freshCookie;
      }
    } catch {
      // Keep existing header if build fails
    }
  });

  return socket;
}

function refetchAfterReconnect(): void {
  void useNotificationStore.getState().fetchList({silent: true});
  void usePrintJobStore.getState().fetchList({silent: true});
}

function onSocketConnect(): void {
  socketClient.isConnected = true;
  if (hadDisconnect) {
    refetchAfterReconnect();
  }
  hadDisconnect = false;
}

function onSocketDisconnect(): void {
  socketClient.isConnected = false;
  hadDisconnect = true;
}

function onNotificationCreated(payload: Notification & {recipientId?: string}): void {
  const userId = useAuthStore.getState().user?.id;
  if (
    payload.recipientScope === 'USER' &&
    payload.recipientId &&
    userId &&
    String(payload.recipientId) !== String(userId)
  ) {
    return;
  }
  useNotificationStore.getState().handleIncoming(payload, {playSound: true});
}

function onNotificationRead(payload: {id?: string; userId?: string}): void {
  const userId = useAuthStore.getState().user?.id;
  if (userId && payload?.userId && String(payload.userId) !== String(userId)) {
    return;
  }
  const id = String(payload?.id || '');
  if (id) {
    useNotificationStore.getState().handleReadEvent(id);
  }
}

function onNotificationReadAll(payload: {userId?: string}): void {
  const userId = useAuthStore.getState().user?.id;
  if (userId && payload?.userId && String(payload.userId) !== String(userId)) {
    return;
  }
  useNotificationStore.getState().handleReadAllEvent();
}

function onForceLogout(payload: {reason?: string}): void {
  if (payload?.reason === 'RESTAURANT_CLOSED') {
    void useAuthStore.getState().logout();
  }
}

function onNewPrintJob(): void {
  usePrintJobStore.getState().handleNewJob();
}

function onPrintJobUpdated(payload: PrintJobEventPayload): void {
  usePrintJobStore.getState().patchJobFromEvent(payload);
}

function attachCoreSocketListeners(socket: Socket): void {
  if (coreListenersAttached) {
    return;
  }

  socket.on('connect', onSocketConnect);
  socket.on('disconnect', onSocketDisconnect);
  socket.on('notification.created', onNotificationCreated);
  socket.on('notification.read', onNotificationRead);
  socket.on('notification.read_all', onNotificationReadAll);
  socket.on('auth:force-logout', onForceLogout);
  socket.on('NEW_PRINT_JOB', onNewPrintJob);
  socket.on('PRINT_JOB_UPDATED', onPrintJobUpdated);
  coreListenersAttached = true;

  if (socket.connected) {
    onSocketConnect();
  }
}

function detachCoreSocketListeners(socket: Socket): void {
  if (!coreListenersAttached) {
    return;
  }

  socket.off('connect', onSocketConnect);
  socket.off('disconnect', onSocketDisconnect);
  socket.off('notification.created', onNotificationCreated);
  socket.off('notification.read', onNotificationRead);
  socket.off('notification.read_all', onNotificationReadAll);
  socket.off('auth:force-logout', onForceLogout);
  socket.off('NEW_PRINT_JOB', onNewPrintJob);
  socket.off('PRINT_JOB_UPDATED', onPrintJobUpdated);
  coreListenersAttached = false;
}

export const socketClient = {
  isConnected: false,
  connect: async (): Promise<void> => {
    if (!config.API_BASE_URL) {
      return;
    }

    const cookie = await buildCookieHeader();
    if (!socketInstance) {
      socketInstance = await createSocket();
    } else if (cookie) {
      socketInstance.io.opts.extraHeaders = {Cookie: cookie};
    }

    const socket = socketInstance;
    if (!socket) {
      return;
    }

    attachCoreSocketListeners(socket);

    if (!socket.connected) {
      socket.connect();
    }
  },
  disconnect: (): void => {
    if (socketInstance?.connected) {
      socketInstance.disconnect();
    }
    socketClient.isConnected = false;
  },
  getInstance: (): Socket | null => socketInstance,
  reset: (): void => {
    if (socketInstance) {
      detachCoreSocketListeners(socketInstance);
      socketInstance.disconnect();
      socketInstance = null;
    }
    socketClient.isConnected = false;
    hadDisconnect = false;
  },
};

/** Connect/disconnect socket with auth session; refetch on app foreground. */
export function useSocketLifecycle(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !config.API_BASE_URL) {
      socketClient.reset();
      return;
    }

    void socketClient.connect();

    return () => {
      socketClient.reset();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !config.API_BASE_URL) {
      return;
    }

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void useNotificationStore.getState().fetchList({silent: true});
        void usePrintJobStore.getState().fetchList({silent: true});
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated]);
}

/** Initialize notification sound prefs and fetch initial notification list. */
export function useNotificationBootstrap(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialize = useNotificationStore((s) => s.initialize);

  useEffect(() => {
    void initNotificationSound();
    if (isAuthenticated) {
      void initialize();
    }
  }, [initialize, isAuthenticated]);
}
