import {useEffect, useRef, useState} from 'react';
import {config} from '../constants/config';
import {useAuthStore} from '../store/authStore';
import type {ConnectionStatus} from '../types/table';
import {socketClient} from '../socket/socket';

const FLOOR_EVENTS = [
  'table:assigned',
  'table:updated',
  'table:released',
  'table:transferred',
  'order:created',
  'order:updated',
  'payment:completed',
] as const;

const REFRESH_DEBOUNCE_MS = 300;

function floorRoom(floorId: string): string {
  return `floor:${floorId}`;
}

export function useFloorRealtime(
  floorId: string | null,
  onRefresh: () => void,
): {connectionStatus: ConnectionStatus} {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const onRefreshRef = useRef(onRefresh);
  const wasDisconnectedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinedFloorRef = useRef<string | null>(null);
  const floorIdRef = useRef(floorId);

  onRefreshRef.current = onRefresh;
  floorIdRef.current = floorId;

  useEffect(() => {
    if (!isAuthenticated || !config.API_BASE_URL) {
      setConnectionStatus('disconnected');
      return;
    }

    let cancelled = false;

    const scheduleRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onRefreshRef.current();
      }, REFRESH_DEBOUNCE_MS);
    };

    const joinFloor = (id: string) => {
      const activeSocket = socketClient.getInstance();
      if (!activeSocket?.connected) {
        return;
      }
      if (joinedFloorRef.current && joinedFloorRef.current !== id) {
        activeSocket.emit('leave', floorRoom(joinedFloorRef.current));
      }
      activeSocket.emit('join', floorRoom(id));
      joinedFloorRef.current = id;
    };

    const leaveFloor = () => {
      const activeSocket = socketClient.getInstance();
      if (!activeSocket?.connected || !joinedFloorRef.current) {
        joinedFloorRef.current = null;
        return;
      }
      activeSocket.emit('leave', floorRoom(joinedFloorRef.current));
      joinedFloorRef.current = null;
    };

    const onConnect = () => {
      if (cancelled) {
        return;
      }
      setConnectionStatus('connected');
      if (wasDisconnectedRef.current) {
        onRefreshRef.current();
      }
      wasDisconnectedRef.current = false;
      if (floorIdRef.current) {
        joinFloor(floorIdRef.current);
      }
    };

    const onDisconnect = () => {
      if (cancelled) {
        return;
      }
      wasDisconnectedRef.current = true;
      setConnectionStatus('disconnected');
    };

    const onReconnectAttempt = () => {
      if (cancelled) {
        return;
      }
      setConnectionStatus('reconnecting');
    };

    const onFloorEvent = () => {
      scheduleRefresh();
    };

    const setup = async () => {
      setConnectionStatus('connecting');
      await socketClient.connect();
      if (cancelled) {
        return;
      }

      const activeSocket = socketClient.getInstance();
      if (!activeSocket) {
        setConnectionStatus('disconnected');
        return;
      }

      activeSocket.on('connect', onConnect);
      activeSocket.on('disconnect', onDisconnect);
      activeSocket.io.on('reconnect_attempt', onReconnectAttempt);

      for (const event of FLOOR_EVENTS) {
        activeSocket.on(event, onFloorEvent);
      }

      if (activeSocket.connected) {
        onConnect();
      }
    };

    setup().catch(() => {
      if (!cancelled) {
        setConnectionStatus('disconnected');
      }
    });

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const activeSocket = socketClient.getInstance();
      if (activeSocket) {
        activeSocket.off('connect', onConnect);
        activeSocket.off('disconnect', onDisconnect);
        activeSocket.io.off('reconnect_attempt', onReconnectAttempt);
        for (const event of FLOOR_EVENTS) {
          activeSocket.off(event, onFloorEvent);
        }
      }
      leaveFloor();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const socket = socketClient.getInstance();
    if (!socket?.connected || !floorId) {
      return;
    }

    if (joinedFloorRef.current && joinedFloorRef.current !== floorId) {
      socket.emit('leave', floorRoom(joinedFloorRef.current));
    }
    socket.emit('join', floorRoom(floorId));
    joinedFloorRef.current = floorId;
  }, [floorId]);

  return {connectionStatus};
}
