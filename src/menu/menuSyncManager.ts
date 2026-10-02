import {
  applyMenuSyncPayload,
  clearMenuForRestaurantChange,
  getSyncMeta,
  readLocalMenu,
} from '../db/repositories/menuRepository';
import {
  fetchMenuSync,
  isMenuSyncConfigured,
} from '../services/menuSyncService';
import {getMockMenuData} from '../mocks/menuMockData';
import type {MenuData} from '../services/menuService';
import type {
  MenuCategory,
  MenuHead,
  MenuOffer,
  MenuProduct,
} from '../types/product';
import {prefetchMenuImages} from './imageCache';
import {useAuthStore} from '../store/authStore';
import type {MenuSyncResponse} from '../services/menuSyncService';

export type MenuSyncStatus =
  | 'idle'
  | 'hydrating'
  | 'syncing'
  | 'ready'
  | 'offline'
  | 'error';

type Listener = (state: MenuSyncManagerState) => void;

export interface MenuSyncManagerState {
  status: MenuSyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  menu: MenuData | null;
  hasLocalData: boolean;
}

const listeners = new Set<Listener>();

let state: MenuSyncManagerState = {
  status: 'idle',
  lastSyncedAt: null,
  error: null,
  menu: null,
  hasLocalData: false,
};

let syncInFlight: Promise<void> | null = null;
let stale = false;
let pendingForceFull = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
}

function setState(partial: Partial<MenuSyncManagerState>) {
  state = {...state, ...partial};
  emit();
}

function toMenuData(
  local: NonNullable<Awaited<ReturnType<typeof readLocalMenu>>>,
): MenuData {
  return {
    categories: local.categories,
    products: local.products,
    offers: local.offers,
    heads: local.heads,
    productHeads: local.productHeads,
    globalTaxes: local.globalTaxes,
    categoryNames: local.categoryNames,
  };
}

function menuFromPayload(payload: MenuSyncResponse): MenuData {
  const offerProducts: MenuProduct[] = (payload.offers || []).map((offer) => ({
    id: offer.id,
    name: offer.name,
    productType: 'KITCHEN',
    status: 'Active',
    category: {id: 'offer', name: 'Offer', status: 'Active'},
    price: offer.price,
    taxes: offer.taxes,
    taxData: offer.taxData,
    isOffer: true,
    imageUrl: offer.imageUrl,
    inclusions: offer.inclusions,
    choices: offer.choices,
    drinks: offer.drinks,
  }));

  const products = [...(payload.products || []), ...offerProducts];
  const categories: MenuCategory[] = payload.categories || [];
  const offers: MenuOffer[] = payload.offers || [];

  const categoryNames = [
    'All',
    ...categories.map((c) => c.name),
    ...(offers.length ? ['Offer'] : []),
  ];

  const menuHeads = (payload.heads || []).filter(
    (h) => h.name && String(h.name).toLowerCase() !== 'offer',
  );

  const heads: MenuHead[] =
    menuHeads.length > 0
      ? [
          {id: 'all', name: 'All'},
          ...menuHeads,
          {id: 'offer', name: 'Offer'},
        ]
      : [
          {id: 'all', name: 'All'},
          ...categories
            .filter((c) => c.name.toLowerCase() !== 'offer')
            .map((c) => ({id: c.id, name: c.name, status: c.status})),
          {id: 'offer', name: 'Offer'},
        ];

  return {
    categories,
    products,
    offers,
    heads,
    productHeads: payload.productHeads || [],
    globalTaxes: payload.taxes || [],
    categoryNames,
  };
}

function localProductCount(): number {
  return state.menu?.products?.length ?? 0;
}

async function hydrateFromSqlite(): Promise<boolean> {
  try {
    const local = await readLocalMenu();
    if (!local) {
      setState({menu: null, hasLocalData: false});
      return false;
    }
    setState({
      menu: toMenuData(local),
      hasLocalData: true,
      status: state.status === 'syncing' ? 'syncing' : 'ready',
    });
    return true;
  } catch {
    return false;
  }
}

async function runSync(forceFull = false): Promise<void> {
  const restaurantId = useAuthStore.getState().restaurant;
  if (!restaurantId) {
    setState({
      status: state.hasLocalData ? 'offline' : 'error',
      error: 'Not signed in to a restaurant. Log in again, then sync.',
    });
    return;
  }

  if (!isMenuSyncConfigured()) {
    const mock = getMockMenuData();
    setState({
      menu: mock,
      hasLocalData: true,
      status: 'ready',
      lastSyncedAt: new Date().toISOString(),
      error: null,
    });
    return;
  }

  setState({status: 'syncing', error: null});

  try {
    await clearMenuForRestaurantChange(String(restaurantId));

    const meta = await getSyncMeta();
    const needsFull =
      forceFull ||
      !meta?.version ||
      meta.restaurantId !== String(restaurantId) ||
      localProductCount() === 0;

    const since = needsFull ? null : meta.version;

    const payload = await fetchMenuSync(since);

    const incomingCount =
      (payload.products?.length || 0) +
      (payload.offers?.length || 0) +
      (payload.categories?.length || 0);

    // Incremental returned nothing but we still have no products — force a full pull once
    if (
      !needsFull &&
      incomingCount === 0 &&
      localProductCount() === 0
    ) {
      const fullPayload = await fetchMenuSync(null);
      return await applyAndPublish(String(restaurantId), fullPayload, true);
    }

    await applyAndPublish(
      String(restaurantId),
      payload,
      payload.fullSync || !since,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Menu sync failed';
    const hasLocal = Boolean(state.menu?.products?.length) || (await hydrateFromSqlite());
    setState({
      status: hasLocal && localProductCount() > 0 ? 'offline' : 'error',
      error: message,
      hasLocalData: hasLocal,
    });
  }
}

async function applyAndPublish(
  restaurantId: string,
  payload: MenuSyncResponse,
  fullSync: boolean,
): Promise<void> {
  const incomingProducts =
    (payload.products?.length || 0) + (payload.offers?.length || 0);

  await applyMenuSyncPayload({
    fullSync,
    version: payload.version,
    serverTime: payload.serverTime,
    restaurantId,
    categories: payload.categories,
    products: payload.products,
    offers: payload.offers,
    heads: payload.heads,
    productHeads: payload.productHeads,
    taxes: payload.taxes,
    deleted: payload.deleted,
  });

  const hydrated = await hydrateFromSqlite();
  const hydratedCount = state.menu?.products?.length ?? 0;

  // Prefer live API payload when SQLite is empty/partial after a non-empty response
  if (incomingProducts > 0 && hydratedCount < incomingProducts) {
    const menu = menuFromPayload(payload);
    setState({
      menu,
      hasLocalData: true,
      status: 'ready',
      lastSyncedAt: payload.serverTime,
      error: hydrated
        ? null
        : 'Synced from server. Local DB read was incomplete — showing live data.',
    });
    prefetchMenuImages(24);
    return;
  }

  if (!hydrated && incomingProducts === 0 && fullSync) {
    setState({
      menu: {
        categories: [],
        products: [],
        offers: [],
        heads: [{id: 'all', name: 'All'}, {id: 'offer', name: 'Offer'}],
        productHeads: [],
        globalTaxes: payload.taxes || [],
        categoryNames: ['All'],
      },
      hasLocalData: false,
      status: 'error',
      lastSyncedAt: payload.serverTime,
      error:
        'Server returned 0 products for this restaurant. Check Admin → Products are Active.',
    });
    return;
  }

  setState({
    status: 'ready',
    lastSyncedAt: payload.serverTime,
    error: null,
    hasLocalData: hydrated || state.hasLocalData,
  });

  prefetchMenuImages(24);
}

export const menuSyncManager = {
  getState(): MenuSyncManagerState {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  },

  markStale(): void {
    stale = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (stale) {
        stale = false;
        void menuSyncManager.sync();
      }
    }, 800);
  },

  async hydrate(): Promise<void> {
    setState({status: 'hydrating'});
    const hasLocal = await hydrateFromSqlite();
    const meta = await getSyncMeta().catch(() => null);
    if (meta?.lastSyncedAt) {
      setState({lastSyncedAt: meta.lastSyncedAt});
    }
    if (!hasLocal || localProductCount() === 0) {
      setState({status: 'syncing'});
    }
  },

  async sync(options?: {forceFull?: boolean}): Promise<void> {
    if (options?.forceFull) {
      pendingForceFull = true;
    }

    if (syncInFlight) {
      stale = true;
      return syncInFlight;
    }

    const runForceFull = pendingForceFull || Boolean(options?.forceFull);
    pendingForceFull = false;

    syncInFlight = runSync(runForceFull).finally(() => {
      syncInFlight = null;
      if (stale || pendingForceFull) {
        stale = false;
        const again = pendingForceFull;
        pendingForceFull = false;
        void menuSyncManager.sync(again ? {forceFull: true} : undefined);
      }
    });

    return syncInFlight;
  },

  async ensureReady(): Promise<void> {
    await menuSyncManager.hydrate();
    const needsFull = !state.hasLocalData || localProductCount() === 0;
    if (needsFull) {
      await menuSyncManager.sync({forceFull: true});
      return;
    }
    // Background refresh — do not await for UI
    void menuSyncManager.sync();
  },
};
