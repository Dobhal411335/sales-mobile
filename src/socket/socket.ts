import {useEffect} from 'react';
import {io, type Socket} from 'socket.io-client';
import {config} from '../constants/config';
import {useAuthStore} from '../store/authStore';
import {useNotificationStore} from '../store/notificationStore';
import {usePrintJobStore} from '../store/printJobStore';
import type {Notification} from '../types/notification';
import type {PrintJobEventPayload} from '../types/printJob';
import {initNotificationSound} from '../services/notificationSoundService';

let socketInstance: Socket | null = null;
let listenerCount = 0;

function getSocket(): Socket | null {
  if (!config.API_BASE_URL) {
    return null;
  }
  if (!socketInstance) {
    socketInstance = io(config.API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socketInstance;
}

export const socketClient = {
  isConnected: false,
  connect: (): void => {
    const socket = getSocket();
    if (!socket || socket.connected) {
      return;
    }
    socket.connect();
  },
  disconnect: (): void => {
    if (socketInstance?.connected) {
      socketInstance.disconnect();
    }
    socketClient.isConnected = false;
  },
  getInstance: (): Socket | null => getSocket(),
};

export function useNotificationRealtime(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const handleIncoming = useNotificationStore((s) => s.handleIncoming);
  const handleReadEvent = useNotificationStore((s) => s.handleReadEvent);
  const handleReadAllEvent = useNotificationStore((s) => s.handleReadAllEvent);
  const initialize = useNotificationStore((s) => s.initialize);

  useEffect(() => {
    void initNotificationSound();
    if (isAuthenticated) {
      void initialize();
    }
  }, [initialize, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !config.API_BASE_URL) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    listenerCount += 1;
    socketClient.connect();

    const onConnect = () => {
      socketClient.isConnected = true;
    };

    const onDisconnect = () => {
      socketClient.isConnected = false;
    };

    const onCreated = (payload: Notification & {recipientId?: string}) => {
      if (
        payload.recipientScope === 'USER' &&
        payload.recipientId &&
        userId &&
        String(payload.recipientId) !== String(userId)
      ) {
        return;
      }
      handleIncoming(payload, {playSound: true});
    };

    const onRead = (payload: {id?: string; userId?: string}) => {
      if (userId && payload?.userId && String(payload.userId) !== String(userId)) {
        return;
      }
      const id = String(payload?.id || '');
      if (id) {
        handleReadEvent(id);
      }
    };

    const onReadAll = (payload: {userId?: string}) => {
      if (userId && payload?.userId && String(payload.userId) !== String(userId)) {
        return;
      }
      handleReadAllEvent();
    };

    const onForceLogout = (payload: {reason?: string}) => {
      if (payload?.reason === 'RESTAURANT_CLOSED') {
        useAuthStore.getState().logout();
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('notification.created', onCreated);
    socket.on('notification.read', onRead);
    socket.on('notification.read_all', onReadAll);
    socket.on('auth:force-logout', onForceLogout);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('notification.created', onCreated);
      socket.off('notification.read', onRead);
      socket.off('notification.read_all', onReadAll);
      socket.off('auth:force-logout', onForceLogout);
      listenerCount = Math.max(0, listenerCount - 1);
      if (listenerCount === 0) {
        socketClient.disconnect();
      }
    };
  }, [
    handleIncoming,
    handleReadAllEvent,
    handleReadEvent,
    isAuthenticated,
    userId,
  ]);
}

export function usePrintJobRealtime(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const patchJobFromEvent = usePrintJobStore((s) => s.patchJobFromEvent);
  const handleNewJob = usePrintJobStore((s) => s.handleNewJob);

  useEffect(() => {
    if (!isAuthenticated || !config.API_BASE_URL) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    listenerCount += 1;
    socketClient.connect();

    const onNewPrintJob = () => {
      handleNewJob();
    };

    const onPrintJobUpdated = (payload: PrintJobEventPayload) => {
      patchJobFromEvent(payload);
    };

    socket.on('NEW_PRINT_JOB', onNewPrintJob);
    socket.on('PRINT_JOB_UPDATED', onPrintJobUpdated);

    return () => {
      socket.off('NEW_PRINT_JOB', onNewPrintJob);
      socket.off('PRINT_JOB_UPDATED', onPrintJobUpdated);
      listenerCount = Math.max(0, listenerCount - 1);
      if (listenerCount === 0) {
        socketClient.disconnect();
      }
    };
  }, [handleNewJob, isAuthenticated, patchJobFromEvent]);
}
