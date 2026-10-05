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
import type {ApiOrder} from '../types/order';
import {perfTimed} from '../utils/perfLog';

interface UseOrderSessionParams {
  orderType?: OrderType;
  tableId?: string;
  sessionId?: string;
  orderId?: string;
  staffId?: string;
  fresh?: boolean;
  freshSession?: boolean;
  seedTableNumber?: string;
  seedFloorName?: string;
  seedFloorId?: string;
  seedGuestCount?: number;
}

function buildScopeKey(params: UseOrderSessionParams): string {
  return [
    params.orderType ?? 'table',
    params.sessionId ?? '',
    params.tableId ?? '',
    params.orderId ?? '',
    params.staffId ?? '',
    params.fresh ? 'fresh' : '',
    params.freshSession ? 'freshSession' : '',
  ].join(':');
}

function isInactiveDirectOrder(order: ApiOrder | null): boolean {
  if (!order) {
    return true;
  }
  const status = String(order.status || '').toUpperCase();
  return (
    status === 'PAID' ||
    String(order.paymentStatus || '').toUpperCase() === 'PAID' ||
    ['COMPLETED', 'CANCELLED', 'WAIVED'].includes(status)
  );
}

function applyHydratedOrder(
  order: ApiOrder,
  hydrateFromOrder: ReturnType<typeof useCartStore.getState>['hydrateFromOrder'],
) {
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
    staffForId: order.staffFor ? String(order.staffFor) : '',
    staffOrderReason: order.staffOrderReason ?? '',
    hasSentKot: hydrated.hasSentKot,
    kotCartFingerprint: hydrated.kotCartFingerprint,
    persistedTotals: hydrated.persistedTotals,
    appliedDiscount: hydrated.appliedDiscount,
    serverName: order.processedByName,
  });
}

export function useOrderSession(params: UseOrderSessionParams) {
  const orderType = params.orderType;
  const tableId = params.tableId;
  const sessionId = params.sessionId;
  const resumeOrderId = params.orderId;
  const staffId = params.staffId;
  const fresh = Boolean(params.fresh);
  const freshSession = Boolean(params.freshSession);
  const seedTableNumber = params.seedTableNumber;
  const seedFloorName = params.seedFloorName;
  const seedFloorId = params.seedFloorId;
  const seedGuestCount = params.seedGuestCount;
  const scopeKey = buildScopeKey({
    orderType,
    tableId,
    sessionId,
    orderId: resumeOrderId,
    staffId,
    fresh,
    freshSession,
  });
  const scopeRef = useRef<string | null>(null);

  const setOrderContext = useOrderStore((s) => s.setOrderContext);
  const setLoading = useOrderStore((s) => s.setLoading);
  const setError = useOrderStore((s) => s.setError);
  const setDirty = useOrderStore((s) => s.setDirty);
  const setSessionScopeKey = useOrderStore((s) => s.setSessionScopeKey);
  const setRemoteUpdatePending = useOrderStore((s) => s.setRemoteUpdatePending);

  const resetOrderState = useCartStore((s) => s.resetOrderState);
  const hydrateFromOrder = useCartStore((s) => s.hydrateFromOrder);
  const setPartyFields = useCartStore((s) => s.setPartyFields);

  const loadSession = useCallback(async () => {
    const routeParams = {orderType, tableId, sessionId};

    if (!config.API_BASE_URL) {
      const base = buildBaseOrderContext(routeParams);
      setOrderContext(base);
      if (staffId) {
        setPartyFields({staffForId: staffId});
      }
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
        // Brand-new seat: seed from Floor props and skip empty order GET.
        if (freshSession) {
          const context = enrichOrderContext(base, {
            tableNumber: seedTableNumber,
            floorName: seedFloorName,
            floorId: seedFloorId,
            guestCount: seedGuestCount,
          });
          context.sessionId = sessionId;
          context.tableId = tableId;
          context.orderId = undefined;
          resetOrderState();
          setOrderContext(context);
          setDirty(false);
          // Settle scope without freshSession so remounts resume normally.
          scopeRef.current = buildScopeKey({
            orderType,
            tableId,
            sessionId,
            orderId: resumeOrderId,
            staffId,
            fresh: false,
            freshSession: false,
          });
          // Background: confirm session metadata (non-blocking for menu).
          void fetchTableSession(sessionId)
            .then((session) => {
              if (!session) {
                return;
              }
              const current = useOrderStore.getState().orderContext;
              if (!current || current.sessionId !== sessionId) {
                return;
              }
              setOrderContext(
                enrichOrderContext(current, {
                  tableNumber: session.tableNumber ?? current.tableNumber,
                  floorName: session.floorName ?? current.floorName,
                  floorId: session.floorId ?? current.floorId,
                  guestCount: session.guestCount ?? current.guestCount,
                }),
              );
            })
            .catch(() => undefined);
          return;
        }

        const [session, order] = await perfTimed(
          'hydrateTableSession+order',
          () =>
            Promise.all([
              fetchTableSession(sessionId),
              fetchOrderBySession(sessionId),
            ]),
        );

        const context = enrichOrderContext(base, {
          tableNumber: session?.tableNumber ?? seedTableNumber,
          floorName: session?.floorName ?? seedFloorName,
          floorId: session?.floorId ?? seedFloorId,
          guestCount: session?.guestCount ?? seedGuestCount,
        });
        context.sessionId = sessionId;
        context.tableId = tableId ?? session?.tableId;
        context.orderId = undefined;

        if (order) {
          applyHydratedOrder(order, hydrateFromOrder);
          context.orderId = order._id;
        } else {
          resetOrderState();
        }

        setOrderContext(context);
        setDirty(false);
        return;
      }

      if (orderType === 'takeaway' || orderType === 'staff') {
        const storageKey = getDirectOrderStorageKey(orderType);

        if (fresh) {
          if (storageKey) {
            await clearDirectOrderId(storageKey);
          }
          resetOrderState();
          if (staffId) {
            setPartyFields({staffForId: staffId});
          }
          setOrderContext(base);
          setDirty(false);
          scopeRef.current = buildScopeKey({
            orderType,
            tableId,
            sessionId,
            orderId: resumeOrderId,
            staffId,
            fresh: false,
          });
          return;
        }

        let order: ApiOrder | null = null;
        const preferredId = resumeOrderId || null;

        if (preferredId) {
          order = await fetchOrderById(preferredId);
          if (isInactiveDirectOrder(order)) {
            if (storageKey) {
              await clearDirectOrderId(storageKey);
            }
            order = null;
          } else if (order && storageKey) {
            await setDirectOrderId(storageKey, order._id);
          }
        } else if (storageKey) {
          const storedOrderId = await getDirectOrderId(storageKey);
          if (storedOrderId) {
            order = await fetchOrderById(storedOrderId);
            if (isInactiveDirectOrder(order)) {
              await clearDirectOrderId(storageKey);
              order = null;
            }
          }
        }

        if (order) {
          applyHydratedOrder(order, hydrateFromOrder);
          base.orderId = order._id;
        } else {
          resetOrderState();
          if (staffId) {
            setPartyFields({staffForId: staffId});
          }
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
    resumeOrderId,
    staffId,
    fresh,
    freshSession,
    seedTableNumber,
    seedFloorName,
    seedFloorId,
    seedGuestCount,
    scopeKey,
    hydrateFromOrder,
    resetOrderState,
    setDirty,
    setError,
    setLoading,
    setOrderContext,
    setPartyFields,
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
        applyHydratedOrder(order, hydrateFromOrder);
        return;
      }

      const storageKey = getDirectOrderStorageKey(orderType);
      if (!storageKey) {
        return;
      }

      const storedOrderId =
        resumeOrderId || (await getDirectOrderId(storageKey));
      if (!storedOrderId) {
        return;
      }

      const order = await fetchOrderById(storedOrderId);
      if (isInactiveDirectOrder(order)) {
        await clearDirectOrderId(storageKey);
        resetOrderState();
        return;
      }

      applyHydratedOrder(order!, hydrateFromOrder);
    } catch {
      // Silent refresh failure — employee can retry manually
    }
  }, [
    orderType,
    sessionId,
    resumeOrderId,
    hydrateFromOrder,
    resetOrderState,
    setRemoteUpdatePending,
  ]);

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
