import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState, type AppStateStatus} from 'react-native';
import {create} from 'zustand';
import {
  submitOrder,
  type SubmitOrderPayload,
  type SubmitOrderResult,
} from '../services/orderService';
import type {CartLineItem} from '../types/cart';

const OUTBOX_KEY = 'tastybites.orderOutbox.v1';
const DRAFT_PREFIX = 'tastybites.orderDraft.v1:';

export interface OrderOutboxEntry {
  id: string;
  createdAt: string;
  payload: SubmitOrderPayload;
  attempts: number;
  lastError?: string;
}

interface OrderOutboxState {
  entries: OrderOutboxEntry[];
  syncing: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  enqueue: (payload: SubmitOrderPayload) => Promise<OrderOutboxEntry>;
  drain: () => Promise<{sent: number; failed: number}>;
  remove: (id: string) => Promise<void>;
}

function makeId(): string {
  return `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readOutbox(): Promise<OrderOutboxEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as OrderOutboxEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOutbox(entries: OrderOutboxEntry[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
}

export async function saveOrderDraft(
  scopeKey: string,
  items: CartLineItem[],
): Promise<void> {
  if (!scopeKey) {
    return;
  }
  try {
    await AsyncStorage.setItem(
      `${DRAFT_PREFIX}${scopeKey}`,
      JSON.stringify({items, savedAt: Date.now()}),
    );
  } catch {
    // Non-blocking
  }
}

export async function loadOrderDraft(
  scopeKey: string,
): Promise<CartLineItem[] | null> {
  if (!scopeKey) {
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(`${DRAFT_PREFIX}${scopeKey}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {items?: CartLineItem[]};
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}

export async function clearOrderDraft(scopeKey: string): Promise<void> {
  if (!scopeKey) {
    return;
  }
  try {
    await AsyncStorage.removeItem(`${DRAFT_PREFIX}${scopeKey}`);
  } catch {
    // ignore
  }
}

export const useOrderOutboxStore = create<OrderOutboxState>((set, get) => ({
  entries: [],
  syncing: false,
  hydrated: false,

  hydrate: async () => {
    const entries = await readOutbox();
    set({entries, hydrated: true});
  },

  enqueue: async (payload) => {
    const entry: OrderOutboxEntry = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      payload,
      attempts: 0,
    };
    const entries = [...get().entries, entry];
    set({entries});
    await writeOutbox(entries);
    return entry;
  },

  remove: async (id) => {
    const entries = get().entries.filter((e) => e.id !== id);
    set({entries});
    await writeOutbox(entries);
  },

  drain: async () => {
    if (get().syncing) {
      return {sent: 0, failed: 0};
    }
    set({syncing: true});
    let sent = 0;
    let failed = 0;
    try {
      let entries = [...get().entries];
      for (const entry of [...entries]) {
        try {
          const result: SubmitOrderResult = await submitOrder(entry.payload);
          if (result.success) {
            entries = entries.filter((e) => e.id !== entry.id);
            sent += 1;
          } else {
            entries = entries.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    attempts: e.attempts + 1,
                    lastError: result.message || 'Submit failed',
                  }
                : e,
            );
            failed += 1;
          }
        } catch (err) {
          entries = entries.map((e) =>
            e.id === entry.id
              ? {
                  ...e,
                  attempts: e.attempts + 1,
                  lastError:
                    err instanceof Error ? err.message : 'Network error',
                }
              : e,
          );
          failed += 1;
        }
      }
      set({entries});
      await writeOutbox(entries);
    } finally {
      set({syncing: false});
    }
    return {sent, failed};
  },
}));

/** Call once from SalesNavigator to hydrate + drain on foreground. */
export function startOrderOutboxLifecycle(): () => void {
  void useOrderOutboxStore.getState().hydrate().then(() => {
    void useOrderOutboxStore.getState().drain();
  });

  const onAppState = (state: AppStateStatus) => {
    if (state === 'active') {
      void useOrderOutboxStore.getState().drain();
    }
  };
  const sub = AppState.addEventListener('change', onAppState);
  return () => sub.remove();
}
