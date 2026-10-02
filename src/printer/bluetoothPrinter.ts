import {NativeModules, PermissionsAndroid, Platform} from 'react-native';

const LINKING_ERROR =
  'BluetoothPrinter native module is not linked. Rebuild the Android app.';

type BtAdapterState = {
  supported: boolean;
  enabled: boolean;
  state: string;
  hasPermission?: boolean;
};

type BtDevice = {
  name: string;
  address: string;
  bonded?: boolean;
  bondState?: number;
  deviceClass?: number;
};

type BtNative = {
  getAdapterState: () => Promise<BtAdapterState>;
  listDevices: () => Promise<BtDevice[]>;
  stopScan: () => Promise<boolean>;
  printBase64: (
    address: string,
    base64Data: string,
  ) => Promise<{success: boolean; address?: string; bytesWritten?: number}>;
  probe: (
    address: string,
  ) => Promise<{success: boolean; address?: string; name?: string}>;
};

const NativeBluetooth: BtNative | undefined =
  Platform.OS === 'android'
    ? (NativeModules.BluetoothPrinter as BtNative | undefined)
    : undefined;

export type DiscoveredBluetoothPrinter = BtDevice;

export function isBluetoothModuleReady(): boolean {
  return Platform.OS === 'android' && !!NativeBluetooth;
}

export async function ensureBluetoothPermissions(): Promise<{
  granted: boolean;
  message?: string;
}> {
  if (Platform.OS !== 'android') {
    return {granted: false, message: 'Bluetooth printing is Android-only.'};
  }
  if (!NativeBluetooth) {
    return {granted: false, message: LINKING_ERROR};
  }

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    ]);
    const connect =
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const scan =
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
      PermissionsAndroid.RESULTS.GRANTED;
    if (!connect || !scan) {
      return {
        granted: false,
        message: 'Bluetooth permission denied. Allow Nearby devices / Bluetooth.',
      };
    }
    return {granted: true};
  }

  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Bluetooth scan permission',
      message: 'Location permission is required to scan for Bluetooth printers on this Android version.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    },
  );
  if (fine !== PermissionsAndroid.RESULTS.GRANTED) {
    return {
      granted: false,
      message: 'Location permission is required to scan Bluetooth printers.',
    };
  }
  return {granted: true};
}

export async function getBluetoothAdapterState(): Promise<BtAdapterState> {
  if (!NativeBluetooth) {
    return {
      supported: false,
      enabled: false,
      state: 'UNSUPPORTED',
      hasPermission: false,
    };
  }
  return NativeBluetooth.getAdapterState();
}

export async function listBluetoothPrinters(): Promise<{
  success: boolean;
  devices?: DiscoveredBluetoothPrinter[];
  error?: string;
  btOff?: boolean;
}> {
  if (!NativeBluetooth) {
    return {success: false, error: LINKING_ERROR};
  }
  const perm = await ensureBluetoothPermissions();
  if (!perm.granted) {
    return {success: false, error: perm.message};
  }
  try {
    const state = await NativeBluetooth.getAdapterState();
    if (!state.supported) {
      return {success: false, error: 'Bluetooth is not supported on this device'};
    }
    if (!state.enabled) {
      return {
        success: false,
        btOff: true,
        error: 'Turn on Bluetooth',
      };
    }
    const devices = await NativeBluetooth.listDevices();
    return {success: true, devices: devices || []};
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as {message?: string}).message || 'Bluetooth scan failed')
        : err instanceof Error
          ? err.message
          : 'Bluetooth scan failed';
    const btOff = /turn on bluetooth|bt_off/i.test(message);
    return {success: false, error: message, btOff};
  }
}

export async function stopBluetoothScan(): Promise<void> {
  if (!NativeBluetooth) return;
  try {
    await NativeBluetooth.stopScan();
  } catch {
    // ignore
  }
}

export async function probeBluetoothPrinter(
  address: string,
): Promise<{success: boolean; address?: string; name?: string; error?: string}> {
  if (!NativeBluetooth) {
    return {success: false, error: LINKING_ERROR};
  }
  const perm = await ensureBluetoothPermissions();
  if (!perm.granted) {
    return {success: false, error: perm.message};
  }
  try {
    const res = await NativeBluetooth.probe(address);
    return {
      success: !!res.success,
      address: res.address,
      name: res.name,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Bluetooth probe failed',
    };
  }
}

export async function sendRawToBluetoothPrinter(
  address: string,
  base64Data: string,
): Promise<{success: boolean; address?: string; error?: string}> {
  if (!NativeBluetooth) {
    return {success: false, error: LINKING_ERROR};
  }
  if (!address?.trim()) {
    return {success: false, error: 'Bluetooth MAC address is required'};
  }
  if (!base64Data) {
    return {success: false, error: 'Print data is empty'};
  }
  const perm = await ensureBluetoothPermissions();
  if (!perm.granted) {
    return {success: false, error: perm.message};
  }
  try {
    const res = await NativeBluetooth.printBase64(address.trim().toUpperCase(), base64Data);
    return {
      success: !!res.success,
      address: res.address,
      error: res.success ? undefined : 'Bluetooth print failed',
    };
  } catch (err: unknown) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as {message?: string}).message || 'Bluetooth print failed')
        : err instanceof Error
          ? err.message
          : 'Bluetooth print failed';
    return {success: false, error: message};
  }
}

export function isBluetoothPrinterConfig(printer?: {
  connectionType?: string | null;
  bluetoothAddress?: string | null;
  enabled?: boolean;
} | null): boolean {
  if (!printer || printer.enabled === false) return false;
  if (String(printer.connectionType || '').toUpperCase() !== 'BLUETOOTH') {
    return false;
  }
  return Boolean(String(printer.bluetoothAddress || '').trim());
}
