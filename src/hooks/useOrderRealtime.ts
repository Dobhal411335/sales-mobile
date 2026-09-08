import {useEffect, useRef} from 'react';
import {config} from '../constants/config';
import {useOrderStore} from '../store/orderStore';
import {socketClient} from '../socket/socket';

const ORDER_EVENTS = ['order:updated', 'payment:completed'] as const;

export function useOrderRealtime(
  floorId: string | undefined,
  onRemoteUpdate: () => void,
): void {
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  useEffect(() => {
    if (!config.API_BASE_URL || !floorId) {
      return;
    }

    let cancelled = false;
    const room = `floor:${floorId}`;

    const handleOrderEvent = () => {
      onRemoteUpdateRef.current();
    };

    const joinRoom = (socket: ReturnType<typeof socketClient.getInstance>) => {
      if (!socket?.connected) {
        return;
      }
      socket.emit('join', room);
      for (const event of ORDER_EVENTS) {
        socket.off(event, handleOrderEvent);
        socket.on(event, handleOrderEvent);
      }
    };

    const onConnect = () => {
      if (cancelled) {
        return;
      }
      const socket = socketClient.getInstance();
      if (socket) {
        joinRoom(socket);
        // Sync any missed events upon reconnect
        handleOrderEvent();
      }
    };

    const setup = async () => {
      await socketClient.connect();
      if (cancelled) {
        return;
      }

      const socket = socketClient.getInstance();
      if (!socket) {
        return;
      }

      socket.on('connect', onConnect);
      if (socket.connected) {
        joinRoom(socket);
      }
    };

    setup().catch(() => undefined);

    return () => {
      cancelled = true;
      const socket = socketClient.getInstance();
      if (socket) {
        socket.off('connect', onConnect);
        for (const event of ORDER_EVENTS) {
          socket.off(event, handleOrderEvent);
        }
        socket.emit('leave', room);
      }
    };
  }, [floorId]);
}

export function useOrderStoreSelectors() {
  return {
    loading: useOrderStore((s) => s.loading),
    error: useOrderStore((s) => s.error),
    dirty: useOrderStore((s) => s.dirty),
    remoteUpdatePending: useOrderStore((s) => s.remoteUpdatePending),
    orderContext: useOrderStore((s) => s.orderContext),
  };
}
