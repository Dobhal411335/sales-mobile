import {NativeModules, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LINKING_ERROR =
  'SerialPriceDisplay native module is not linked. Rebuild Android (npm run android).';

const STORAGE_KEY = '@tastybites/serial_price_display_v1';

export type PriceDisplayMode = 'price' | 'total' | 'collect' | 'change';

type SerialPriceNative = {
  listPorts: () => Promise<{
    ports: string[];
    selectedPort?: string;
    baud?: number;
  }>;
  configure: (
    port: string | null,
    baud: number,
  ) => Promise<{success: boolean; port: string; baud: number}>;
  showAmount: (
    amountText: string,
    mode?: string,
  ) => Promise<{success: boolean; port?: string; baud?: number; error?: string}>;
  clear: () => Promise<{success: boolean; error?: string}>;
};

const NativeSerialPrice: SerialPriceNative | undefined =
  Platform.OS === 'android'
    ? (NativeModules.SerialPriceDisplay as SerialPriceNative | undefined)
    : undefined;

export type PriceDisplaySettings = {
  enabled: boolean;
  port: string; // AUTO or /dev/ttySx
  baud: number;
};

export const DEFAULT_PRICE_DISPLAY_SETTINGS: PriceDisplaySettings = {
  enabled: true,
  port: 'AUTO',
  baud: 2400,
};

let cached: PriceDisplaySettings = {...DEFAULT_PRICE_DISPLAY_SETTINGS};
let hydrated = false;

export function isPriceDisplayModuleReady(): boolean {
  return Platform.OS === 'android' && !!NativeSerialPrice;
}

export async function hydratePriceDisplaySettings(): Promise<PriceDisplaySettings> {
  if (hydrated) return cached;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PriceDisplaySettings>;
      cached = {
        enabled: parsed.enabled !== false,
        port: String(parsed.port || 'AUTO'),
        baud: Number(parsed.baud) > 0 ? Number(parsed.baud) : 2400,
      };
    }
  } catch {
    // keep defaults
  }
  hydrated = true;
  if (NativeSerialPrice) {
    try {
      await NativeSerialPrice.configure(
        cached.port === 'AUTO' ? null : cached.port,
        cached.baud,
      );
    } catch {
      // ignore
    }
  }
  return cached;
}

export async function updatePriceDisplaySettings(
  patch: Partial<PriceDisplaySettings>,
): Promise<PriceDisplaySettings> {
  await hydratePriceDisplaySettings();
  cached = {
    ...cached,
    ...patch,
    port: patch.port !== undefined ? String(patch.port) : cached.port,
    baud: patch.baud !== undefined ? Number(patch.baud) || 2400 : cached.baud,
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // ignore
  }
  if (NativeSerialPrice) {
    try {
      await NativeSerialPrice.configure(
        cached.port === 'AUTO' ? null : cached.port,
        cached.baud,
      );
    } catch {
      // ignore
    }
  }
  return cached;
}

export function getPriceDisplaySettings(): PriceDisplaySettings {
  return cached;
}

export async function listPriceDisplayPorts() {
  if (!NativeSerialPrice) return {ports: [] as string[]};
  return NativeSerialPrice.listPorts();
}

export function formatAmountForPriceDisplay(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return Math.abs(n).toFixed(2);
}

export async function showPriceDisplayAmount(
  amount: number | string,
  mode: PriceDisplayMode = 'total',
): Promise<{success: boolean; error?: string; port?: string}> {
  if (!NativeSerialPrice) {
    return {success: false, error: LINKING_ERROR};
  }
  await hydratePriceDisplaySettings();
  if (!cached.enabled) {
    return {success: false, error: 'Price display disabled'};
  }
  const text =
    typeof amount === 'number' ? formatAmountForPriceDisplay(amount) : String(amount);
  try {
    return await NativeSerialPrice.showAmount(text, mode);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update price display',
    };
  }
}

export async function clearPriceDisplay(): Promise<void> {
  if (!NativeSerialPrice) return;
  try {
    await NativeSerialPrice.clear();
  } catch {
    // ignore
  }
}
