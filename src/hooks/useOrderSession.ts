import {useCallback, useEffect, useRef} from 'react';
import {config} from '../constants/config';
import {useOrderStore} from '../store/orderStore';
import {useCartStore} from '../store/cartStore';
import type {OrderType} from '../navigation/types';
import {
  buildBaseOrderContext,
  enrichOrderContext,
  getDirectOrderStorageKey,
} from '../utils/orderContextMapper';
import {
  clearDirectOrderId,
  getDirectOrderId,
  setDirectOrderId,
} from '../utils/directOrderStorage';
import {
  buildCartFromOrderItems,
  hydrateCartFromOrder,
  mapOrderToCartTotals,
} from '../utils/orderCartMapper';
import {fetchOrderById, fetchOrderBySession} from '../services/orderService';
import {fetchTableSession} from '../services/sessionService';

interface UseOrderSessionParams {
  orderType?: OrderType;
  tableId?: string;
  sessionId?: string;
}

function buildScopeKey(params: UseOrderSessionParams): string {
  return [
    params.orderType ?? 'table',
    params.sessionId ?? '',
    params.tableId ?? '',
  ].join(':');
}

export function useOrderSession(params: UseOrderSessionParams) {
  const orderType = params.orderType;
  const tableId = params.tableId;
  const sessionId = params.sessionId;
  const scopeKey = buildScopeKey({orderType, tableId, sessionId});
  const scopeRef = useRef<string | null>(null);

  const setOrderContext = useOrderStore((s) => s.setOrderContext);
  const setLoading = useOrderStore((s) => s.setLoading);
  const setError = useOrderStore((s) => s.setError);
  const setDirty = useOrderStore((s) => s.setDirty);
  const setSessionScopeKey = useOrderStore((s) => s.setSessionScopeKey);
  const setRemoteUpdatePending = useOrderStore((s) => s.setRemoteUpdatePending);

  const resetOrderState = useCartStore((s) => s.resetOrderState);
  const hydrateFromOrder = useCartStore((s) => s.hydrateFromOrder);

  const loadSession = useCallback(async () => {
    const routeParams = {orderType, tableId, sessionId};

    if (!config.API_BASE_URL) {
      const base = buildBaseOrderContext(routeParams);
      setOrderContext(base);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setRemoteUpdatePending(false);

    const currentScope = scopeKey;
    if (scopeRef.current !== currentScope) {
      resetOrderState();
      scopeRef.current = currentScope;
    }

    setSessionScopeKey(currentScope);

    try {
      const base = buildBaseOrderContext(routeParams);

      if (orderType === 'table' && sessionId) {
        const session = await fetchTableSession(sessionId);
        const context = enrichOrderContext(base, {
          tableNumber: session?.tableNumber,
          floorName: session?.floorName,
          floorId: session?.floorId,
          guestCount: session?.guestCount,
        });
        context.sessionId = sessionId;
        context.tableId = tableId ?? session?.tableId;
        context.orderId = undefined;

        const order = await fetchOrderBySession(sessionId);
        if (order) {
          const hydrated = hydrateCartFromOrder(order);
          hydrateFromOrder({
            items: hydrated.items,
            orderNumber: order.orderNumber,
            orderId: order._id,
            orderStatus: order.status,
            orderNote: order.specialNote,
            partyName: order.partyName,
            guestName: order.guestName,
            guestPhone: order.contactNumber ?? '',
            guestCountryCode: order.guestCountryCode ?? '+1',
            guestEmail: order.guestEmail ?? '',
            hasSentKot: hydrated.hasSentKot,
            kotCartFingerprint: hydrated.kotCartFingerprint,
            persistedTotals: hydrated.persistedTotals,
            appliedDiscount: hydrated.appliedDiscount,
            serverName: order.processedByName,
          });
          context.orderId = order._id;
        } else {
          resetOrderState();
        }

        setOrderContext(context);
        setDirty(false);
        return;
      }

      if (orderType === 'walking' || orderType === 'staff') {
        const storageKey = getDirectOrderStorageKey(orderType);
        let order = null;

        if (storageKey) {
          const storedOrderId = await getDirectOrderId(storageKey);
          if (storedOrderId) {
            order = await fetchOrderById(storedOrderId);
            if (!order) {
              await clearDirectOrderId(storageKey);
            }
          }
        }

        if (order) {
          const hydrated = hydrateCartFromOrder(order);
          hydrateFromOrder({
            items: hydrated.items,
            orderNumber: order.orderNumber,
            orderId: order._id,
            orderStatus: order.status,
            orderNote: order.specialNote,
            partyName: order.partyName,
            guestName: order.guestName,
            guestPhone: order.contactNumber ?? '',
            guestCountryCode: order.guestCountryCode ?? '+1',
            guestEmail: order.guestEmail ?? '',
            hasSentKot: hydrated.hasSentKot,
            kotCartFingerprint: hydrated.kotCartFingerprint,
            persistedTotals: hydrated.persistedTotals,
            appliedDiscount: hydrated.appliedDiscount,
            serverName: order.processedByName,
          });
          base.orderId = order._id;
        } else {
          resetOrderState();
        }

        setOrderContext(base);
        setDirty(false);
        return;
      }

      setOrderContext(base);
      resetOrderState();
      setDirty(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load order. Check your connection and try again.';
      setError(message);
      setOrderContext(buildBaseOrderContext(routeParams));
    } finally {
      setLoading(false);
    }
  }, [
    orderType,
    tableId,
    sessionId,
    scopeKey,
    hydrateFromOrder,
    resetOrderState,
    setDirty,
    setError,
    setLoading,
    setOrderContext,
    setRemoteUpdatePending,
    setSessionScopeKey,
  ]);

  const refetchOrder = useCallback(async () => {
    if (!config.API_BASE_URL) {
      return;
    }

    const dirty = useOrderStore.getState().dirty;
    if (dirty) {
      setRemoteUpdatePending(true);
      return;
    }

    try {
      if (orderType === 'table' && sessionId) {
        const order = await fetchOrderBySession(sessionId);
        if (!order) {
          return;
        }
        const hydrated = hydrateCartFromOrder(order);
        hydrateFromOrder({
          items: hydrated.items,
          orderNumber: order.orderNumber,
          orderId: order._id,
          orderStatus: order.status,
          orderNote: order.specialNote,
          partyName: order.partyName,
          guestName: order.guestName,
          guestPhone: order.contactNumber ?? '',
          guestCountryCode: order.guestCountryCode ?? '+1',
          guestEmail: order.guestEmail ?? '',
          hasSentKot: hydrated.hasSentKot,
          kotCartFingerprint: hydrated.kotCartFingerprint,
          persistedTotals: hydrated.persistedTotals,
          appliedDiscount: hydrated.appliedDiscount,
          serverName: order.processedByName,
        });
        return;
      }

      const storageKey = getDirectOrderStorageKey(orderType);
      if (!storageKey) {
        return;
      }

      const storedOrderId = await getDirectOrderId(storageKey);
      if (!storedOrderId) {
        return;
      }

      const order = await fetchOrderById(storedOrderId);
      if (!order) {
        return;
      }

      const hydrated = hydrateCartFromOrder(order);
      hydrateFromOrder({
        items: hydrated.items,
        orderNumber: order.orderNumber,
        orderId: order._id,
        orderStatus: order.status,
        orderNote: order.specialNote,
        partyName: order.partyName,
        guestName: order.guestName,
        guestPhone: order.contactNumber ?? '',
        guestCountryCode: order.guestCountryCode ?? '+1',
        guestEmail: order.guestEmail ?? '',
        hasSentKot: hydrated.hasSentKot,
        kotCartFingerprint: hydrated.kotCartFingerprint,
        persistedTotals: hydrated.persistedTotals,
        appliedDiscount: hydrated.appliedDiscount,
        serverName: order.processedByName,
      });
    } catch {
      // Silent refresh failure — employee can retry manually
    }
  }, [orderType, sessionId, hydrateFromOrder, setRemoteUpdatePending]);

  const persistDirectOrderId = useCallback(
    async (orderId: string) => {
      const storageKey = getDirectOrderStorageKey(orderType);
      if (storageKey) {
        await setDirectOrderId(storageKey, orderId);
      }
    },
    [orderType],
  );

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    reload: loadSession,
    refetchOrder,
    persistDirectOrderId,
    scopeKey,
  };
}

export async function syncOrderResponseItems(
  items: ReturnType<typeof buildCartFromOrderItems>,
  totals: ReturnType<typeof mapOrderToCartTotals>,
): Promise<void> {
  useCartStore.getState().syncItemsFromServer(items, totals);
}
