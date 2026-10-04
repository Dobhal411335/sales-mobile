import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tastybites/customer_display_settings_v1';

export type CustomerDisplaySettings = {
  /** When false, cart sync does not push to the secondary screen. */
  enabled: boolean;
  /** Show item lines (name / qty / price) under the total. */
  showLineItems: boolean;
  /** Optional brand override; empty uses app name. */
  brand: string;
  /** Footer when cart is active. */
  cartFooter: string;
  /** Footer after payment. */
  paidFooter: string;
};

export const DEFAULT_CUSTOMER_DISPLAY_SETTINGS: CustomerDisplaySettings = {
  enabled: true,
  showLineItems: true,
  brand: '',
  cartFooter: 'Thank you',
  paidFooter: 'Thank you — please come again',
};

type Listener = () => void;

let cached: CustomerDisplaySettings = {...DEFAULT_CUSTOMER_DISPLAY_SETTINGS};
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getCustomerDisplaySettings(): CustomerDisplaySettings {
  return cached;
}

export function subscribeCustomerDisplaySettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function hydrateCustomerDisplaySettings(): Promise<CustomerDisplaySettings> {
  if (hydrated) return cached;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CustomerDisplaySettings>;
      cached = {
        ...DEFAULT_CUSTOMER_DISPLAY_SETTINGS,
        ...parsed,
        enabled: parsed.enabled !== false,
        showLineItems: parsed.showLineItems !== false,
        brand: String(parsed.brand ?? ''),
        cartFooter:
          String(parsed.cartFooter || DEFAULT_CUSTOMER_DISPLAY_SETTINGS.cartFooter),
        paidFooter:
          String(parsed.paidFooter || DEFAULT_CUSTOMER_DISPLAY_SETTINGS.paidFooter),
      };
    }
  } catch {
    // keep defaults
  }
  hydrated = true;
  emit();
  return cached;
}

export async function updateCustomerDisplaySettings(
  patch: Partial<CustomerDisplaySettings>,
): Promise<CustomerDisplaySettings> {
  await hydrateCustomerDisplaySettings();
  cached = {
    ...cached,
    ...patch,
    brand: patch.brand !== undefined ? String(patch.brand) : cached.brand,
    cartFooter:
      patch.cartFooter !== undefined
        ? String(patch.cartFooter)
        : cached.cartFooter,
    paidFooter:
      patch.paidFooter !== undefined
        ? String(patch.paidFooter)
        : cached.paidFooter,
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // ignore persist failures
  }
  emit();
  return cached;
}
