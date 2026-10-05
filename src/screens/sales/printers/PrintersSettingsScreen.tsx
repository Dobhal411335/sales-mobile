import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {config} from '../../../constants/config';
import {colors} from '../../../constants/colors';
import {SalesPageSkeleton} from '../../../components/common/SalesPageSkeleton';
import {useAuth} from '../../../hooks/useAuth';
import type {SalesStackParamList} from '../../../navigation/types';
import {
  listBluetoothPrinters,
  probeBluetoothPrinter,
  stopBluetoothScan,
  type DiscoveredBluetoothPrinter,
} from '../../../printer/bluetoothPrinter';
import {
  scanSubnetForPrinters,
  subnetPrefixFromHost,
  type DiscoveredPrinter,
} from '../../../printer/networkScan';
import {probeNetworkPrinter} from '../../../printer/networkPrinter';
import {
  isBluetoothPrinter,
  isBuiltInUsbPrinter,
  isNetworkPrinter,
  printerService,
} from '../../../printer/printerService';
import {
  BUILTIN_SYSTEM_PRINTER_NAME,
  isBuiltInUsbModuleReady,
  listUsbPrinterDevices,
  probeBuiltInUsbPrinter,
} from '../../../printer/usbPrinter';
import {
  clearPriceDisplay,
  hydratePriceDisplaySettings,
  isPriceDisplayModuleReady,
  listPriceDisplayPorts,
  showPriceDisplayAmount,
  updatePriceDisplaySettings,
} from '../../../display/priceDisplay';
import {
  createAdminPrinter,
  deleteAdminPrinter,
  fetchAdminPrinters,
  updateAdminPrinter,
} from '../../../services/printerAdminService';
import {fetchPrinters} from '../../../services/printJobService';
import {
  mapReachabilityToUiStatus,
  usePrinterStatusStore,
  type PrinterUiStatus,
} from '../../../store/printerStatusStore';
import type {
  PrinterConfig,
  PrinterOrderType,
  PrinterPaperWidthMm,
  PrinterTarget,
} from '../../../types/printJob';
import {canManagePrinters} from '../../../utils/floorRoles';

type Props = NativeStackScreenProps<SalesStackParamList, 'PrintersSettings'>;

type FormConnection = 'NETWORK' | 'BLUETOOTH' | 'USB' | 'BUILTIN_USB';

const TARGET_OPTIONS: {value: PrinterTarget; label: string}[] = [
  {value: 'KITCHEN', label: 'Kitchen (KOT)'},
  {value: 'COUNTER', label: 'Bar / Counter'},
  {value: 'RECEIPT', label: 'Customer Receipt'},
];

const ORDER_TYPE_OPTIONS: {value: PrinterOrderType; label: string}[] = [
  {value: 'TAKE_AWAY', label: 'Take away'},
  {value: 'DINE_IN', label: 'Dine In'},
  {value: 'DELIVERY', label: 'Delivery'},
];

const PAPER_SIZES: PrinterPaperWidthMm[] = [58, 72, 78, 80];

const EMPTY_FORM = {
  name: '',
  target: 'RECEIPT' as PrinterTarget,
  connection: 'NETWORK' as FormConnection,
  host: '',
  port: String(config.DEFAULT_PRINTER_PORT),
  bluetoothAddress: '',
  bluetoothName: '',
  usbVendorId: null as number | null,
  usbProductId: null as number | null,
  usbDeviceName: '',
  paperWidthMm: 80 as PrinterPaperWidthMm,
  orderTypes: ['TAKE_AWAY', 'DINE_IN', 'DELIVERY'] as PrinterOrderType[],
  enabled: true,
};

type UsbListItem = {
  name: string;
  deviceName?: string;
  vendorId: number;
  productId: number;
  hasPermission?: boolean;
  likelyPrinter?: boolean;
};

function statusColor(status: PrinterUiStatus): string {
  if (status === 'ONLINE') return colors.success;
  if (status === 'OFFLINE') return colors.error;
  if (status === 'CHECKING') return colors.warning;
  return colors.textSecondary;
}

function statusLabel(status: PrinterUiStatus): string {
  if (status === 'ONLINE') return 'Online';
  if (status === 'OFFLINE') return 'Offline';
  if (status === 'CHECKING') return 'Checking';
  return 'Unknown';
}

function isBuiltInUsbPrinterConfigLoose(printer: PrinterConfig): boolean {
  if (String(printer.connectionType || '').toUpperCase() !== 'USB') return false;
  const sys = String(printer.systemPrinterName || '').trim().toUpperCase();
  return sys === 'BUILTIN' || sys === 'ANDROID_BUILTIN' || sys === 'ANDROID-BUILTIN';
}

function formConnectionFromPrinter(printer: PrinterConfig): FormConnection {
  const conn = String(printer.connectionType || '').toUpperCase();
  if (conn === 'BLUETOOTH') return 'BLUETOOTH';
  if (isBuiltInUsbPrinterConfigLoose(printer)) return 'BUILTIN_USB';
  if (conn === 'USB') return 'USB';
  return 'NETWORK';
}

function connectionLabel(printer: PrinterConfig): string {
  if (isBuiltInUsbPrinterConfigLoose(printer)) {
    return `Built-in USB (${printer.systemPrinterName || 'BUILTIN'})`;
  }
  const conn = String(printer.connectionType || '').toUpperCase();
  if (conn === 'BLUETOOTH') {
    return `Bluetooth ${printer.bluetoothAddress || ''}`.trim();
  }
  if (conn === 'USB') {
    if (printer.usbVendorId != null && printer.usbProductId != null) {
      return `USB VID:${printer.usbVendorId} PID:${printer.usbProductId}`;
    }
    return printer.systemPrinterName || 'USB';
  }
  if (isNetworkPrinter(printer)) {
    return `${printer.host}:${printer.port || config.DEFAULT_PRINTER_PORT}`;
  }
  return printer.systemPrinterName || conn || '—';
}

export function PrintersSettingsScreen(_props: Props) {
  const {user} = useAuth();
  const canEdit = canManagePrinters(user?.role);
  const liveById = usePrinterStatusStore((s) => s.byId);
  const setChecking = usePrinterStatusStore((s) => s.setChecking);
  const setResult = usePrinterStatusStore((s) => s.setResult);
  const builtInUsbSupported =
    Platform.OS === 'android' && isBuiltInUsbModuleReady();

  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testingForm, setTestingForm] = useState(false);

  const [scanPrefix, setScanPrefix] = useState('192.168.1');
  const [scanningNet, setScanningNet] = useState(false);
  const [scanProgress, setScanProgress] = useState({done: 0, total: 0});
  const [discoveredNet, setDiscoveredNet] = useState<DiscoveredPrinter[]>([]);
  const scanCancelRef = useRef({cancelled: false});

  const [scanningBt, setScanningBt] = useState(false);
  const [btDevices, setBtDevices] = useState<DiscoveredBluetoothPrinter[]>([]);
  const [btHint, setBtHint] = useState<string | null>(null);

  const [usbDevices, setUsbDevices] = useState<UsbListItem[]>([]);
  const [scanningUsb, setScanningUsb] = useState(false);
  const [priceDisplayInfo, setPriceDisplayInfo] = useState<string | null>(null);
  const [priceTestBusy, setPriceTestBusy] = useState(false);

  const setMany = usePrinterStatusStore((s) => s.setMany);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const adminRes = canEdit ? await fetchAdminPrinters() : null;
        let list: PrinterConfig[] = [];
        if (adminRes?.success && adminRes.data) {
          list = adminRes.data;
        } else {
          const salesRes = await fetchPrinters();
          if (!salesRes.success) {
            setError(
              adminRes?.message ||
                salesRes.message ||
                'Unable to load printers.',
            );
            return;
          }
          list = salesRes.data || [];
        }
        setPrinters(list);
        setMany(
          list.map((p) => ({
            printerId: String(p._id),
            status: mapReachabilityToUiStatus(
              p.lastReachability,
              p.enabled !== false,
            ),
            host: p.host || p.bluetoothAddress,
            port: p.port,
            error: p.lastReachability?.error || null,
            checkedAt: p.lastReachability?.checkedAt || null,
            source: (p.lastReachability?.source as 'mobile') || null,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load printers.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canEdit, setMany],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      void (async () => {
        if (!isPriceDisplayModuleReady()) {
          setPriceDisplayInfo(
            'Price LED module not linked — rebuild Android app.',
          );
          return;
        }
        const settings = await hydratePriceDisplaySettings();
        const ports = await listPriceDisplayPorts();
        setPriceDisplayInfo(
          `Price LED ready · port ${settings.port} · ${settings.baud} baud` +
            (ports.ports?.length
              ? ` · found ${ports.ports.join(', ')}`
              : ''),
        );
      })();
      return () => {
        scanCancelRef.current.cancelled = true;
        void stopBluetoothScan();
      };
    }, [load]),
  );

  const resolveStatus = useCallback(
    (printer: PrinterConfig): PrinterUiStatus => {
      const live = liveById[String(printer._id)];
      if (live?.status) return live.status;
      return mapReachabilityToUiStatus(
        printer.lastReachability,
        printer.enabled !== false,
      );
    },
    [liveById],
  );

  const sorted = useMemo(() => {
    const order: Record<string, number> = {
      KITCHEN: 0,
      COUNTER: 1,
      RECEIPT: 2,
    };
    return [...printers].sort(
      (a, b) => (order[a.target] ?? 9) - (order[b.target] ?? 9),
    );
  }, [printers]);

  const startNetworkScan = useCallback(async () => {
    const inferred =
      subnetPrefixFromHost(form.host) ||
      subnetPrefixFromHost(sorted.find((p) => p.host)?.host) ||
      scanPrefix;
    const prefix = (scanPrefix || inferred).trim().replace(/\.$/, '');
    setScanPrefix(prefix);
    scanCancelRef.current = {cancelled: false};
    setScanningNet(true);
    setDiscoveredNet([]);
    setScanProgress({done: 0, total: 0});
    setError(null);
    setMessage('Scanning Wi‑Fi / Ethernet (port 9100)…');
    try {
      const found = await scanSubnetForPrinters({
        subnetPrefix: prefix,
        port: Number(form.port) || config.DEFAULT_PRINTER_PORT,
        signal: scanCancelRef.current,
        onProgress: (done, total) => setScanProgress({done, total}),
      });
      if (scanCancelRef.current.cancelled) {
        setMessage('Scan cancelled.');
        return;
      }
      setDiscoveredNet(found);
      setMessage(
        found.length
          ? `Found ${found.length} printer(s) on port ${form.port || config.DEFAULT_PRINTER_PORT}.`
          : `No printers found on ${prefix}.x. Enter IP manually.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanningNet(false);
    }
  }, [form.host, form.port, scanPrefix, sorted]);

  const startBluetoothScan = useCallback(async () => {
    setScanningBt(true);
    setBtDevices([]);
    setBtHint(null);
    setError(null);
    setMessage('Scanning Bluetooth…');
    try {
      const res = await listBluetoothPrinters();
      if (res.btOff) {
        setBtHint('Turn on Bluetooth');
        setMessage(null);
        Alert.alert(
          'Bluetooth is off',
          'Turn on Bluetooth in system settings, then tap Bluetooth again to scan.',
        );
        return;
      }
      if (!res.success) {
        setError(res.error || 'Bluetooth scan failed.');
        setMessage(null);
        return;
      }
      setBtDevices(res.devices || []);
      setMessage(
        res.devices?.length
          ? `Found ${res.devices.length} Bluetooth device(s). Tap one to select.`
          : 'No paired Bluetooth devices. Pair the printer in Android settings, then scan again.',
      );
    } finally {
      setScanningBt(false);
    }
  }, []);

  const startUsbScan = useCallback(async () => {
    setScanningUsb(true);
    setError(null);
    setMessage('Listing USB devices…');
    try {
      const list = await listUsbPrinterDevices();
      setUsbDevices(list);
      setMessage(
        list.length
          ? `Found ${list.length} USB device(s). Tap one to select.`
          : 'No USB devices detected. Plug in the printer and try again.',
      );
    } finally {
      setScanningUsb(false);
    }
  }, []);

  const selectConnection = useCallback(
    (connection: FormConnection) => {
      setForm((p) => ({
        ...p,
        connection,
        name:
          connection === 'BUILTIN_USB'
            ? p.name || 'Built-in Receipt'
            : p.name,
      }));
      setShowForm(true);
      setMessage(null);
      setError(null);

      if (connection === 'NETWORK') {
        void startNetworkScan();
      } else if (connection === 'BLUETOOTH') {
        void startBluetoothScan();
      } else if (connection === 'USB') {
        void startUsbScan();
      } else if (connection === 'BUILTIN_USB') {
        void (async () => {
          const probe = await probeBuiltInUsbPrinter();
          setMessage(
            probe.success
              ? `Built-in USB ready (${probe.portName}).`
              : probe.error || 'Built-in USB not detected.',
          );
        })();
      }
    },
    [startBluetoothScan, startNetworkScan, startUsbScan],
  );

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...EMPTY_FORM,
      connection: builtInUsbSupported ? 'BUILTIN_USB' : 'NETWORK',
      name: builtInUsbSupported ? 'Built-in Receipt' : '',
    });
    setShowForm(true);
    setMessage(null);
    setDiscoveredNet([]);
    setBtDevices([]);
    setUsbDevices([]);
    selectConnection(builtInUsbSupported ? 'BUILTIN_USB' : 'NETWORK');
  };

  const openEdit = (printer: PrinterConfig) => {
    const connection = formConnectionFromPrinter(printer);
    setEditId(String(printer._id));
    setForm({
      name: printer.name || '',
      target: printer.target,
      connection,
      host: printer.host || '',
      port: String(printer.port || config.DEFAULT_PRINTER_PORT),
      bluetoothAddress: printer.bluetoothAddress || '',
      bluetoothName: printer.name || '',
      usbVendorId: printer.usbVendorId ?? null,
      usbProductId: printer.usbProductId ?? null,
      usbDeviceName: printer.systemPrinterName || '',
      paperWidthMm: (printer.paperWidthMm as PrinterPaperWidthMm) || 80,
      orderTypes:
        printer.orderTypes && printer.orderTypes.length
          ? ([...printer.orderTypes] as PrinterOrderType[])
          : ['TAKE_AWAY', 'DINE_IN', 'DELIVERY'],
      enabled: printer.enabled !== false,
    });
    setShowForm(true);
    setMessage(null);
    selectConnection(connection);
  };

  const buildPayload = () => {
    const name = form.name.trim();
    const location =
      form.target === 'KITCHEN'
        ? ('KITCHEN' as const)
        : form.target === 'COUNTER'
          ? ('BAR' as const)
          : ('COUNTER' as const);

    const shared = {
      name,
      target: form.target,
      purpose: form.target,
      enabled: form.enabled,
      isActive: form.enabled,
      type: 'THERMAL' as const,
      location,
      paperWidthMm: form.paperWidthMm,
      orderTypes: form.orderTypes,
    };

    if (form.connection === 'BUILTIN_USB') {
      return {
        ...shared,
        connectionType: 'USB' as const,
        systemPrinterName: BUILTIN_SYSTEM_PRINTER_NAME,
        host: null,
        ipAddress: null,
        port: null,
        bluetoothAddress: null,
        usbVendorId: null,
        usbProductId: null,
      };
    }

    if (form.connection === 'USB') {
      return {
        ...shared,
        connectionType: 'USB' as const,
        systemPrinterName:
          form.usbDeviceName.trim() ||
          (form.usbVendorId != null && form.usbProductId != null
            ? `USB:${form.usbVendorId}:${form.usbProductId}`
            : 'USB'),
        host: null,
        ipAddress: null,
        port: null,
        bluetoothAddress: null,
        usbVendorId: form.usbVendorId,
        usbProductId: form.usbProductId,
      };
    }

    if (form.connection === 'BLUETOOTH') {
      return {
        ...shared,
        connectionType: 'BLUETOOTH' as const,
        bluetoothAddress: form.bluetoothAddress.trim().toUpperCase(),
        systemPrinterName: form.bluetoothName.trim() || null,
        host: null,
        ipAddress: null,
        port: null,
        usbVendorId: null,
        usbProductId: null,
      };
    }

    const host = form.host.trim();
    const port = Number(form.port) || config.DEFAULT_PRINTER_PORT;
    return {
      ...shared,
      connectionType: 'NETWORK' as const,
      host,
      ipAddress: host,
      port,
      bluetoothAddress: null,
      systemPrinterName: null,
      usbVendorId: null,
      usbProductId: null,
    };
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'Printer name is required.';
    if (form.connection === 'BUILTIN_USB' && !builtInUsbSupported) {
      return 'Built-in USB printing is only available on this Android POS app build.';
    }
    if (form.connection === 'NETWORK' && !form.host.trim()) {
      return 'Printer IP / hostname is required for Wi‑Fi / Ethernet.';
    }
    if (form.connection === 'BLUETOOTH' && !form.bluetoothAddress.trim()) {
      return 'Select a Bluetooth printer (MAC address required).';
    }
    if (
      form.connection === 'USB' &&
      form.usbVendorId == null &&
      !form.usbDeviceName.trim()
    ) {
      return 'Select a USB device from the list.';
    }
    if (!form.orderTypes.length) {
      return 'Select at least one order type.';
    }
    return null;
  };

  const handleSave = async () => {
    if (!canEdit) return;
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = buildPayload();

    try {
      const res = editId
        ? await updateAdminPrinter(editId, payload)
        : await createAdminPrinter(payload);
      if (!res.success) {
        setError(res.message || 'Save failed.');
        return;
      }
      setMessage(editId ? 'Printer updated.' : 'Printer saved.');
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      await load(true);
    } finally {
      setSaving(false);
    }
  };

  const formAsPrinterConfig = (): PrinterConfig => {
    const payload = buildPayload();
    return {
      _id: editId || 'draft',
      name: payload.name,
      target: payload.target,
      connectionType: payload.connectionType,
      host: payload.host,
      port: payload.port,
      bluetoothAddress: payload.bluetoothAddress,
      systemPrinterName: payload.systemPrinterName,
      usbVendorId: payload.usbVendorId,
      usbProductId: payload.usbProductId,
      paperWidthMm: payload.paperWidthMm,
      orderTypes: payload.orderTypes,
      enabled: payload.enabled,
    };
  };

  const handleTestForm = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setTestingForm(true);
    setError(null);
    try {
      const printer = formAsPrinterConfig();
      const result = await printerService.testPrinterDirect(printer);
      setMessage(
        result.message || (result.success ? 'Test sent.' : 'Test failed.'),
      );
      if (!result.success) {
        setError(result.message || 'Test failed.');
      }
    } finally {
      setTestingForm(false);
    }
  };

  const handleProbe = async (printer: PrinterConfig) => {
    const id = String(printer._id);
    setBusyId(id);
    setChecking(id);
    try {
      if (
        isBuiltInUsbPrinter(printer) ||
        isBuiltInUsbPrinterConfigLoose(printer)
      ) {
        const result = await probeBuiltInUsbPrinter();
        setResult(id, {
          status: result.success ? 'ONLINE' : 'OFFLINE',
          host: result.portName || 'BUILTIN',
          error: result.error || null,
          checkedAt: new Date().toISOString(),
          source: 'mobile',
        });
        setMessage(
          result.success
            ? `${printer.name} built-in USB is ready (${result.portName}).`
            : result.error || `${printer.name} is offline.`,
        );
        return;
      }

      if (isBluetoothPrinter(printer) && printer.bluetoothAddress) {
        const result = await probeBluetoothPrinter(printer.bluetoothAddress);
        setResult(id, {
          status: result.success ? 'ONLINE' : 'OFFLINE',
          host: printer.bluetoothAddress,
          error: result.error || null,
          checkedAt: new Date().toISOString(),
          source: 'mobile',
        });
        setMessage(
          result.success
            ? `${printer.name} Bluetooth is online.`
            : result.error || `${printer.name} is offline.`,
        );
        return;
      }

      if (!isNetworkPrinter(printer) || !printer.host) {
        Alert.alert('Not configured', 'This printer has no reachable host.');
        return;
      }
      const result = await probeNetworkPrinter({
        host: printer.host,
        port: printer.port || config.DEFAULT_PRINTER_PORT,
      });
      setResult(id, {
        status: result.success ? 'ONLINE' : 'OFFLINE',
        host: printer.host,
        port: printer.port || config.DEFAULT_PRINTER_PORT,
        error: result.error || null,
        checkedAt: new Date().toISOString(),
        source: 'mobile',
      });
      setMessage(
        result.success
          ? `${printer.name} is online.`
          : result.error || `${printer.name} is offline.`,
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleTest = async (printer: PrinterConfig) => {
    const canLocal =
      isNetworkPrinter(printer) ||
      isBuiltInUsbPrinter(printer) ||
      isBuiltInUsbPrinterConfigLoose(printer) ||
      isBluetoothPrinter(printer);
    if (!canLocal) {
      Alert.alert(
        'Not supported here',
        'Windows USB spooler printers need the Windows print bridge. On this tablet use Built-in USB, USB, Network, or Bluetooth.',
      );
      return;
    }
    const id = String(printer._id);
    setBusyId(id);
    try {
      const result = await printerService.testPrinterDirect(printer);
      setMessage(
        result.message || (result.success ? 'Test sent.' : 'Test failed.'),
      );
      if (result.success) {
        setResult(id, {
          status: 'ONLINE',
          host:
            printer.host ||
            printer.bluetoothAddress ||
            printer.systemPrinterName ||
            'BUILTIN',
          port: printer.port || undefined,
          checkedAt: new Date().toISOString(),
          source: 'mobile',
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (printer: PrinterConfig, enabled: boolean) => {
    if (!canEdit) return;
    const connection = formConnectionFromPrinter(printer);
    const isBuiltIn = connection === 'BUILTIN_USB';
    const res = await updateAdminPrinter(String(printer._id), {
      name: printer.name,
      target: printer.target,
      purpose: printer.target,
      connectionType:
        connection === 'BUILTIN_USB'
          ? 'USB'
          : connection === 'NETWORK'
            ? 'NETWORK'
            : connection,
      host: isBuiltIn || connection === 'BLUETOOTH' || connection === 'USB'
        ? null
        : printer.host,
      ipAddress:
        isBuiltIn || connection === 'BLUETOOTH' || connection === 'USB'
          ? null
          : printer.host,
      port:
        isBuiltIn || connection === 'BLUETOOTH' || connection === 'USB'
          ? null
          : printer.port || config.DEFAULT_PRINTER_PORT,
      bluetoothAddress:
        connection === 'BLUETOOTH' ? printer.bluetoothAddress : null,
      usbVendorId: connection === 'USB' ? printer.usbVendorId : null,
      usbProductId: connection === 'USB' ? printer.usbProductId : null,
      paperWidthMm: printer.paperWidthMm || 80,
      orderTypes: printer.orderTypes || ['TAKE_AWAY', 'DINE_IN', 'DELIVERY'],
      systemPrinterName: isBuiltIn
        ? BUILTIN_SYSTEM_PRINTER_NAME
        : printer.systemPrinterName,
      enabled,
      isActive: enabled,
      type: printer.type || 'THERMAL',
      location: (printer.location as 'COUNTER' | 'KITCHEN' | 'BAR') || null,
    });
    if (!res.success) {
      setError(res.message || 'Failed to update printer.');
      return;
    }
    await load(true);
  };

  const handleDelete = (printer: PrinterConfig) => {
    if (!canEdit) return;
    Alert.alert(
      'Remove printer?',
      `Remove ${printer.name}? Print jobs will stay queued until another printer is configured.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const res = await deleteAdminPrinter(String(printer._id));
              if (!res.success) {
                setError(res.message || 'Failed to remove printer.');
                return;
              }
              setMessage('Printer removed.');
              await load(true);
            })();
          },
        },
      ],
    );
  };

  const toggleOrderType = (value: PrinterOrderType) => {
    setForm((prev) => {
      const has = prev.orderTypes.includes(value);
      const next = has
        ? prev.orderTypes.filter((t) => t !== value)
        : [...prev.orderTypes, value];
      return {...prev, orderTypes: next};
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <SalesPageSkeleton variant="orderList" rows={5} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load(true);
          }}
          tintColor={colors.primary}
        />
      }>
      <Text style={styles.title}>Printer settings</Text>
      <Text style={styles.subtitle}>
        Configure Kitchen KOT, Bar/Counter, and Customer Receipt printers.
        Choose Wi‑Fi/Ethernet, Bluetooth, USB, or Built-in — scan starts when
        you select a connection.
      </Text>

      {!canEdit ? (
        <Text style={styles.hint}>
          You can view connected printers and send a test print. Master
          Terminal or Manager Terminal can add, edit, or remove printers.
        </Text>
      ) : (
        <Text style={styles.hint}>
          You can add, edit, and remove printers for this restaurant.
        </Text>
      )}

      {priceDisplayInfo ? (
        <View style={styles.displayLink}>
          <Text style={styles.displayLinkTitle}>Customer price LED</Text>
          <Text style={styles.hint}>{priceDisplayInfo}</Text>
          <Text style={styles.hint}>
            Shows bill total on the green 0.00 panel while you ring up / pay.
            The black tinted window is decorative only.
          </Text>
          <View style={styles.priceActions}>
            <Pressable
              style={[styles.secondaryBtn, priceTestBusy && styles.btnDisabled]}
              disabled={priceTestBusy}
              onPress={() => {
                void (async () => {
                  setPriceTestBusy(true);
                  try {
                    await updatePriceDisplaySettings({enabled: true});
                    const res = await showPriceDisplayAmount(12.34, 'total');
                    setMessage(
                      res.success
                        ? `Price LED test OK (${res.port || 'AUTO'})`
                        : res.error || 'Price LED test failed',
                    );
                  } finally {
                    setPriceTestBusy(false);
                  }
                })();
              }}>
              <Text style={styles.secondaryBtnText}>
                {priceTestBusy ? 'Sending…' : 'Test 12.34'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                void clearPriceDisplay();
                setMessage('Price LED cleared');
              }}>
              <Text style={styles.secondaryBtnText}>Clear LED</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {sorted.map((printer) => {
        const status = resolveStatus(printer);
        const live = liveById[String(printer._id)];
        const busy = busyId === String(printer._id);

        return (
          <View key={printer._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{flex: 1}}>
                <Text style={styles.cardTitle}>
                  {TARGET_OPTIONS.find((t) => t.value === printer.target)
                    ?.label || printer.target}
                </Text>
                <Text style={styles.cardName}>{printer.name}</Text>
                <Text style={styles.cardMeta}>{connectionLabel(printer)}</Text>
                <Text style={styles.cardMeta}>
                  Paper {printer.paperWidthMm || 80}mm
                  {printer.orderTypes?.length
                    ? ` · ${printer.orderTypes.join(', ')}`
                    : ''}
                </Text>
                {(live?.checkedAt || printer.lastReachability?.checkedAt) && (
                  <Text style={styles.cardMeta}>
                    Last checked:{' '}
                    {new Date(
                      live?.checkedAt ||
                        printer.lastReachability?.checkedAt ||
                        '',
                    ).toLocaleString()}
                  </Text>
                )}
                {(live?.error || printer.lastReachability?.error) &&
                status === 'OFFLINE' ? (
                  <Text style={styles.cardError}>
                    {live?.error || printer.lastReachability?.error}
                  </Text>
                ) : null}
              </View>
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    {backgroundColor: statusColor(status)},
                  ]}
                />
                <Text style={[styles.statusText, {color: statusColor(status)}]}>
                  {statusLabel(status)}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Pressable
                style={[styles.btn, styles.btnSecondary]}
                disabled={busy}
                onPress={() => void handleProbe(printer)}>
                <Text style={styles.btnSecondaryText}>
                  {busy ? '…' : status === 'OFFLINE' ? 'Retry' : 'Refresh'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnPrimary]}
                disabled={busy || !printer.enabled}
                onPress={() => void handleTest(printer)}>
                <Text style={styles.btnPrimaryText}>Test Print</Text>
              </Pressable>
              {canEdit ? (
                <Pressable
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={() => openEdit(printer)}>
                  <Text style={styles.btnSecondaryText}>Edit</Text>
                </Pressable>
              ) : null}
            </View>

            {canEdit ? (
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Enabled</Text>
                <Switch
                  value={printer.enabled !== false}
                  onValueChange={(v) => void handleToggle(printer, v)}
                  trackColor={{false: colors.border, true: colors.primaryLight}}
                  thumbColor={
                    printer.enabled !== false
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Pressable onPress={() => handleDelete(printer)}>
                  <Text style={styles.deleteText}>Remove</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      {!sorted.length ? (
        <Text style={styles.empty}>
          No printers configured yet. Add a Kitchen, Bar, or Receipt printer
          below.
        </Text>
      ) : null}

      {canEdit ? (
        <>
          <Pressable
            style={[styles.btn, styles.btnPrimary, styles.addBtn]}
            onPress={openCreate}>
            <Text style={styles.btnPrimaryText}>Add Printer</Text>
          </Pressable>

          {showForm ? (
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>
                {editId ? 'Edit printer' : 'New printer'}
              </Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(name) => setForm((p) => ({...p, name}))}
                placeholder="Kitchen Printer"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>Purpose</Text>
              <View style={styles.chips}>
                {TARGET_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      form.target === opt.value && styles.chipActive,
                    ]}
                    onPress={() => setForm((p) => ({...p, target: opt.value}))}>
                    <Text
                      style={[
                        styles.chipText,
                        form.target === opt.value && styles.chipTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Connection</Text>
              <View style={styles.radioList}>
                {(
                  [
                    {value: 'NETWORK' as const, label: 'WIFI or Ethernet'},
                    {value: 'BLUETOOTH' as const, label: 'Bluetooth'},
                    {value: 'USB' as const, label: 'USB'},
                    ...(builtInUsbSupported
                      ? [
                          {
                            value: 'BUILTIN_USB' as const,
                            label: 'Built-in / Urovo-style',
                          },
                        ]
                      : []),
                  ] as {value: FormConnection; label: string}[]
                ).map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.radioRow,
                      form.connection === opt.value && styles.radioRowActive,
                    ]}
                    onPress={() => selectConnection(opt.value)}>
                    <View
                      style={[
                        styles.radioOuter,
                        form.connection === opt.value && styles.radioOuterActive,
                      ]}>
                      {form.connection === opt.value ? (
                        <View style={styles.radioInner} />
                      ) : null}
                    </View>
                    <Text style={styles.radioLabel}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              {form.connection === 'NETWORK' ? (
                <View style={styles.nestedPanel}>
                  <Text style={styles.label}>IP address</Text>
                  <TextInput
                    style={styles.input}
                    value={form.host}
                    onChangeText={(host) => setForm((p) => ({...p, host}))}
                    placeholder="192.168.1.50"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    keyboardType="numeric"
                  />
                  <Text style={styles.label}>Port</Text>
                  <TextInput
                    style={styles.input}
                    value={form.port}
                    onChangeText={(port) => setForm((p) => ({...p, port}))}
                    placeholder={String(config.DEFAULT_PRINTER_PORT)}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.label}>Subnet (for scan)</Text>
                  <TextInput
                    style={styles.input}
                    value={scanPrefix}
                    onChangeText={setScanPrefix}
                    placeholder="192.168.1"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    keyboardType="numeric"
                  />
                  <View style={styles.row}>
                    <Pressable
                      style={[styles.btn, styles.btnPrimary, {flex: 1}]}
                      disabled={scanningNet}
                      onPress={() => void startNetworkScan()}>
                      <Text style={styles.btnPrimaryText}>
                        {scanningNet
                          ? `Scanning ${scanProgress.done}/${scanProgress.total || '…'}`
                          : 'Scan WIFI/LAN'}
                      </Text>
                    </Pressable>
                    {scanningNet ? (
                      <Pressable
                        style={[styles.btn, styles.btnSecondary]}
                        onPress={() => {
                          scanCancelRef.current.cancelled = true;
                        }}>
                        <Text style={styles.btnSecondaryText}>Stop</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {discoveredNet.map((d) => (
                    <Pressable
                      key={`${d.host}:${d.port}`}
                      style={[
                        styles.discoveredRow,
                        form.host === d.host && styles.discoveredRowActive,
                      ]}
                      onPress={() =>
                        setForm((p) => ({
                          ...p,
                          host: d.host,
                          port: String(d.port),
                          name: p.name || `Network Printer ${d.host}`,
                        }))
                      }>
                      <Text style={styles.cardName}>{d.host}</Text>
                      <Text style={styles.cardMeta}>
                        Port {d.port} · Tap to use
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {form.connection === 'BLUETOOTH' ? (
                <View style={styles.nestedPanel}>
                  {btHint ? (
                    <Text style={styles.error}>{btHint}</Text>
                  ) : (
                    <Text style={styles.hint}>
                      Paired printers appear below. If Bluetooth is off, turn it
                      on and scan again.
                    </Text>
                  )}
                  <Text style={styles.label}>MAC address</Text>
                  <TextInput
                    style={styles.input}
                    value={form.bluetoothAddress}
                    onChangeText={(bluetoothAddress) =>
                      setForm((p) => ({...p, bluetoothAddress}))
                    }
                    placeholder="AA:BB:CC:DD:EE:FF"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                  />
                  <Pressable
                    style={[styles.btn, styles.btnPrimary]}
                    disabled={scanningBt}
                    onPress={() => void startBluetoothScan()}>
                    <Text style={styles.btnPrimaryText}>
                      {scanningBt ? 'Scanning…' : 'Scan Bluetooth'}
                    </Text>
                  </Pressable>
                  {btDevices.map((d) => (
                    <Pressable
                      key={d.address}
                      style={[
                        styles.discoveredRow,
                        form.bluetoothAddress === d.address &&
                          styles.discoveredRowActive,
                      ]}
                      onPress={() =>
                        setForm((p) => ({
                          ...p,
                          bluetoothAddress: d.address,
                          bluetoothName: d.name,
                          name: p.name || d.name || 'Bluetooth Printer',
                        }))
                      }>
                      <Text style={styles.cardName}>
                        {d.name || 'Bluetooth device'}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {d.address}
                        {d.bonded ? ' · Paired' : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {form.connection === 'USB' ? (
                <View style={styles.nestedPanel}>
                  <Text style={styles.hint}>
                    Select a USB device. Non-printers may appear — you can still
                    pick them manually.
                  </Text>
                  <Pressable
                    style={[styles.btn, styles.btnPrimary]}
                    disabled={scanningUsb}
                    onPress={() => void startUsbScan()}>
                    <Text style={styles.btnPrimaryText}>
                      {scanningUsb ? 'Listing…' : 'Refresh USB list'}
                    </Text>
                  </Pressable>
                  {usbDevices.map((d) => {
                    const selected =
                      form.usbVendorId === d.vendorId &&
                      form.usbProductId === d.productId;
                    return (
                      <Pressable
                        key={`${d.vendorId}:${d.productId}:${d.deviceName}`}
                        style={[
                          styles.discoveredRow,
                          selected && styles.discoveredRowActive,
                          !d.likelyPrinter && styles.discoveredRowMuted,
                        ]}
                        onPress={() =>
                          setForm((p) => ({
                            ...p,
                            usbVendorId: d.vendorId,
                            usbProductId: d.productId,
                            usbDeviceName: d.name,
                            name: p.name || d.name || 'USB Printer',
                          }))
                        }>
                        <Text style={styles.cardName}>{d.name}</Text>
                        <Text style={styles.cardMeta}>
                          VID {d.vendorId} · PID {d.productId}
                          {d.likelyPrinter ? ' · Likely printer' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {form.connection === 'BUILTIN_USB' ? (
                <View style={styles.nestedPanel}>
                  <Text style={styles.hint}>
                    Uses this POS tablet&apos;s built-in thermal printer via
                    USB. Saved as system name BUILTIN.
                  </Text>
                </View>
              ) : null}

              <Text style={styles.label}>Order types</Text>
              <View style={styles.chips}>
                {ORDER_TYPE_OPTIONS.map((opt) => {
                  const active = form.orderTypes.includes(opt.value);
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleOrderType(opt.value)}>
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Paper size (mm)</Text>
              <View style={styles.chips}>
                {PAPER_SIZES.map((size) => (
                  <Pressable
                    key={size}
                    style={[
                      styles.chip,
                      form.paperWidthMm === size && styles.chipActive,
                    ]}
                    onPress={() =>
                      setForm((p) => ({...p, paperWidthMm: size}))
                    }>
                    <Text
                      style={[
                        styles.chipText,
                        form.paperWidthMm === size && styles.chipTextActive,
                      ]}>
                      {size}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Enabled</Text>
                <Switch
                  value={form.enabled}
                  onValueChange={(enabled) =>
                    setForm((p) => ({...p, enabled}))
                  }
                  trackColor={{false: colors.border, true: colors.primaryLight}}
                  thumbColor={
                    form.enabled ? colors.primary : colors.textSecondary
                  }
                />
              </View>

              <View style={styles.row}>
                <Pressable
                  style={[styles.btn, styles.btnSecondary, {flex: 1}]}
                  disabled={testingForm}
                  onPress={() => void handleTestForm()}>
                  <Text style={styles.btnSecondaryText}>
                    {testingForm ? 'Testing…' : 'Test printer'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnPrimary, {flex: 1}]}
                  disabled={saving}
                  onPress={() => void handleSave()}>
                  <Text style={styles.btnPrimaryText}>
                    {saving ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.btn, styles.btnSecondary, {marginTop: 8}]}
                onPress={() => {
                  setShowForm(false);
                  setEditId(null);
                  void stopBluetoothScan();
                }}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      <Text style={styles.footerNote}>
        Tip: reserve network printer IPs in DHCP. For Bluetooth, pair the
        printer in Android settings first. For built-in USB, allow USB
        permission when Android asks.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {padding: 16, paddingBottom: 40},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 22, fontWeight: '700', color: colors.text},
  subtitle: {marginTop: 6, color: colors.textSecondary, lineHeight: 20},
  hint: {marginTop: 10, color: colors.textSecondary, fontSize: 13, lineHeight: 18},
  error: {marginTop: 12, color: colors.error},
  message: {marginTop: 12, color: colors.success},
  empty: {marginTop: 24, color: colors.textSecondary, textAlign: 'center'},
  card: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardHeader: {flexDirection: 'row', gap: 12},
  cardTitle: {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
  cardName: {fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2},
  cardMeta: {fontSize: 13, color: colors.textSecondary, marginTop: 2},
  cardError: {fontSize: 12, color: colors.error, marginTop: 4},
  statusPill: {alignItems: 'flex-end', gap: 4},
  statusDot: {width: 10, height: 10, borderRadius: 5},
  statusText: {fontSize: 12, fontWeight: '700'},
  row: {flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap'},
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimary: {backgroundColor: colors.primary},
  btnPrimaryText: {color: colors.surface, fontWeight: '700', fontSize: 13},
  btnSecondary: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {color: colors.text, fontWeight: '600', fontSize: 13},
  toggleRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {color: colors.text, fontWeight: '600'},
  deleteText: {color: colors.error, fontWeight: '600', marginLeft: 'auto'},
  sectionTitle: {fontSize: 16, fontWeight: '700', color: colors.text},
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.background,
  },
  discoveredRow: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  discoveredRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  discoveredRowMuted: {opacity: 0.85},
  displayLink: {
    marginTop: 4,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  displayLinkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  priceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  secondaryBtnText: {color: colors.text, fontWeight: '600', fontSize: 13},
  btnDisabled: {opacity: 0.55},
  addBtn: {marginTop: 16},
  form: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: {marginTop: 12, fontWeight: '600', color: colors.text, fontSize: 13},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  chipText: {fontSize: 12, color: colors.text},
  chipTextActive: {fontWeight: '700', color: colors.primaryHover},
  radioList: {marginTop: 8, gap: 6},
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  radioRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {borderColor: colors.primary},
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  radioLabel: {fontSize: 14, fontWeight: '600', color: colors.text},
  nestedPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  footerNote: {
    marginTop: 20,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
