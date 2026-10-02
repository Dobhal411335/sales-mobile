import {NativeModules, Platform} from 'react-native';
import {config} from '../constants/config';

const LINKING_ERROR =
  'CustomerDisplay native module is not linked. Rebuild the Android app (npm run android).';

export type CustomerDisplayLine = {
  name: string;
  qty?: number;
  priceText?: string;
};

export type CustomerDisplayPayload = {
  brand?: string;
  title?: string;
  totalLabel?: string;
  totalText?: string;
  footer?: string;
  mode?: 'cart' | 'paid' | 'idle';
  lines?: CustomerDisplayLine[];
};

type CustomerDisplayNative = {
  getDisplays: () => Promise<
    Array<{
      displayId: number;
      name: string;
      isDefault: boolean;
      flags: number;
      state: number;
    }>
  >;
  isAvailable: () => Promise<{
    available: boolean;
    displayId?: number;
    name?: string;
  }>;
  show: (payload: CustomerDisplayPayload) => Promise<{
    success: boolean;
    available?: boolean;
    displayId?: number;
    error?: string;
  }>;
  clear: () => Promise<{success: boolean}>;
  dismiss: () => Promise<{success: boolean}>;
};

const NativeCustomerDisplay: CustomerDisplayNative | undefined =
  Platform.OS === 'android'
    ? (NativeModules.CustomerDisplay as CustomerDisplayNative | undefined)
    : undefined;

export function isCustomerDisplayModuleReady(): boolean {
  return Platform.OS === 'android' && !!NativeCustomerDisplay;
}

export async function getCustomerDisplays() {
  if (!NativeCustomerDisplay) return [];
  try {
    return (await NativeCustomerDisplay.getDisplays()) || [];
  } catch {
    return [];
  }
}

export async function isCustomerDisplayAvailable(): Promise<{
  available: boolean;
  displayId?: number;
  name?: string;
  error?: string;
}> {
  if (!NativeCustomerDisplay) {
    return {available: false, error: LINKING_ERROR};
  }
  try {
    return await NativeCustomerDisplay.isAvailable();
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : 'Customer display check failed',
    };
  }
}

export async function showCustomerDisplay(
  payload: CustomerDisplayPayload,
): Promise<{success: boolean; available?: boolean; error?: string}> {
  if (!NativeCustomerDisplay) {
    return {success: false, available: false, error: LINKING_ERROR};
  }
  try {
    return await NativeCustomerDisplay.show({
      brand: payload.brand || config.APP_NAME.toUpperCase(),
      title: payload.title || 'Your order',
      totalLabel: payload.totalLabel || 'TOTAL',
      totalText: payload.totalText || '$0.00',
      footer: payload.footer || 'Thank you',
      mode: payload.mode || 'cart',
      lines: payload.lines || [],
    });
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Failed to update customer display',
    };
  }
}

export async function clearCustomerDisplay(): Promise<void> {
  if (!NativeCustomerDisplay) return;
  try {
    await NativeCustomerDisplay.clear();
  } catch {
    // ignore
  }
}

export async function dismissCustomerDisplay(): Promise<void> {
  if (!NativeCustomerDisplay) return;
  try {
    await NativeCustomerDisplay.dismiss();
  } catch {
    // ignore
  }
}

export function formatMoneyForDisplay(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${Math.abs(n).toFixed(2)}`;
}
