import {NativeModules, Platform} from 'react-native';

const LINKING_ERROR =
  'BuiltInUsbPrinter native module is not linked. Do a full Android rebuild (not just Metro reload): npm run android. Emulators have no built-in USB printer — use a physical POS tablet.';

type BuiltInUsbNative = {
  isAvailable: () => Promise<{
    available: boolean;
    portName?: string;
    vendorId?: number;
    productId?: number;
    hasPermission?: boolean;
  }>;
  listUsbDevices?: () => Promise<
    Array<{
      name: string;
      deviceName?: string;
      vendorId: number;
      productId: number;
      hasPermission?: boolean;
      likelyPrinter?: boolean;
    }>
  >;
  printBase64: (
    base64Data: string,
  ) => Promise<{success: boolean; portName?: string; bytesWritten?: number}>;
  printBase64ForIds?: (
    base64Data: string,
    vendorId: number,
    productId: number,
  ) => Promise<{success: boolean; portName?: string; bytesWritten?: number}>;
};

const NativeBuiltInUsb: BuiltInUsbNative | undefined =
  Platform.OS === 'android'
    ? (NativeModules.BuiltInUsbPrinter as BuiltInUsbNative | undefined)
    : undefined;

export const BUILTIN_SYSTEM_PRINTER_NAME = 'BUILTIN';

export function isBuiltInUsbModuleReady(): boolean {
  return Platform.OS === 'android' && !!NativeBuiltInUsb;
}

/**
 * True when this PrinterConfig should print via the Android tablet's
 * built-in USB thermal head (AutoReplyPrint).
 *
 * On Android we accept any enabled USB config — Admin may have saved
 * Windows-style names; the tablet still owns the physical printer.
 * BUILTIN / ANDROID_BUILTIN remain the preferred markers.
 */
export function isBuiltInUsbPrinterConfig(printer?: {
  connectionType?: string | null;
  systemPrinterName?: string | null;
  enabled?: boolean;
} | null): boolean {
  if (!printer || printer.enabled === false) return false;
  if (String(printer.connectionType || '').toUpperCase() !== 'USB') return false;
  if (Platform.OS !== 'android') {
    const sys = String(printer.systemPrinterName || '').trim().toUpperCase();
    return (
      sys === 'BUILTIN' ||
      sys === 'ANDROID_BUILTIN' ||
      sys === 'ANDROID-BUILTIN'
    );
  }
  return true;
}

export async function probeBuiltInUsbPrinter(): Promise<{
  success: boolean;
  portName?: string;
  error?: string;
}> {
  if (!NativeBuiltInUsb) {
    return {success: false, error: LINKING_ERROR};
  }
  try {
    const res = await NativeBuiltInUsb.isAvailable();
    if (!res.available) {
      return {success: false, error: 'Built-in USB printer not detected on this device'};
    }
    return {success: true, portName: res.portName};
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'USB probe failed',
    };
  }
}

export async function listUsbPrinterDevices(): Promise<
  Array<{
    name: string;
    deviceName?: string;
    vendorId: number;
    productId: number;
    hasPermission?: boolean;
    likelyPrinter?: boolean;
  }>
> {
  if (!NativeBuiltInUsb?.listUsbDevices) {
    return [];
  }
  try {
    return (await NativeBuiltInUsb.listUsbDevices()) || [];
  } catch {
    return [];
  }
}

export async function sendRawToBuiltInUsbPrinter(
  base64Data: string,
  opts?: {vendorId?: number | null; productId?: number | null},
): Promise<{success: boolean; portName?: string; error?: string}> {
  if (!NativeBuiltInUsb) {
    return {success: false, error: LINKING_ERROR};
  }
  if (!base64Data) {
    return {success: false, error: 'Print data is empty'};
  }
  try {
    const vid = opts?.vendorId;
    const pid = opts?.productId;
    const res =
      vid != null &&
      pid != null &&
      NativeBuiltInUsb.printBase64ForIds
        ? await NativeBuiltInUsb.printBase64ForIds(base64Data, vid, pid)
        : await NativeBuiltInUsb.printBase64(base64Data);
    return {
      success: !!res.success,
      portName: res.portName,
      error: res.success ? undefined : 'USB print failed',
    };
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as {message?: string}).message || 'USB print failed')
        : err instanceof Error
          ? err.message
          : 'USB print failed';
    return {success: false, error: message};
  }
}
