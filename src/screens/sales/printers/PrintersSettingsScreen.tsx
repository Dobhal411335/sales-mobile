import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {useAuth} from '../../../hooks/useAuth';
import type {SalesStackParamList} from '../../../navigation/types';
import {
  scanSubnetForPrinters,
  subnetPrefixFromHost,
  type DiscoveredPrinter,
} from '../../../printer/networkScan';
import {probeNetworkPrinter} from '../../../printer/networkPrinter';
import {isNetworkPrinter, printerService} from '../../../printer/printerService';
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
import type {PrinterConfig, PrinterTarget} from '../../../types/printJob';
import {canManagePrinters} from '../../../utils/floorRoles';

type Props = NativeStackScreenProps<SalesStackParamList, 'PrintersSettings'>;

const TARGET_OPTIONS: {value: PrinterTarget; label: string}[] = [
  {value: 'KITCHEN', label: 'Kitchen (KOT)'},
  {value: 'COUNTER', label: 'Bar / Counter'},
  {value: 'RECEIPT', label: 'Customer Receipt'},
];

const EMPTY_FORM = {
  name: '',
  target: 'RECEIPT' as PrinterTarget,
  host: '',
  port: String(config.DEFAULT_PRINTER_PORT),
  enabled: true,
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

export function PrintersSettingsScreen(_props: Props) {
  const {user} = useAuth();
  const canEdit = canManagePrinters(user?.role);
  const liveById = usePrinterStatusStore((s) => s.byId);
  const setChecking = usePrinterStatusStore((s) => s.setChecking);
  const setResult = usePrinterStatusStore((s) => s.setResult);

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

  const [scanPrefix, setScanPrefix] = useState('192.168.1');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({done: 0, total: 0});
  const [discovered, setDiscovered] = useState<DiscoveredPrinter[]>([]);
  const scanCancelRef = React.useRef({cancelled: false});

  const setMany = usePrinterStatusStore((s) => s.setMany);

  const load = useCallback(async (silent = false) => {
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
          host: p.host,
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
  }, [canEdit, setMany]);

  useFocusEffect(
    useCallback(() => {
      void load();
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

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMessage(null);
  };

  const openEdit = (printer: PrinterConfig) => {
    setEditId(String(printer._id));
    setForm({
      name: printer.name || '',
      target: printer.target,
      host: printer.host || '',
      port: String(printer.port || config.DEFAULT_PRINTER_PORT),
      enabled: printer.enabled !== false,
    });
    setShowForm(true);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    const name = form.name.trim();
    const host = form.host.trim();
    const port = Number(form.port) || config.DEFAULT_PRINTER_PORT;
    if (!name) {
      setError('Printer name is required.');
      return;
    }
    if (!host) {
      setError('Printer IP / hostname is required for network printing.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      name,
      target: form.target,
      purpose: form.target,
      connectionType: 'NETWORK' as const,
      host,
      ipAddress: host,
      port,
      enabled: form.enabled,
      isActive: form.enabled,
      type: 'THERMAL',
      location:
        form.target === 'KITCHEN'
          ? ('KITCHEN' as const)
          : form.target === 'COUNTER'
            ? ('BAR' as const)
            : ('COUNTER' as const),
    };

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

  const handleProbe = async (printer: PrinterConfig) => {
    if (!isNetworkPrinter(printer) || !printer.host) {
      Alert.alert('Not configured', 'This printer has no network host.');
      return;
    }
    const id = String(printer._id);
    setBusyId(id);
    setChecking(id);
    try {
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
    if (!isNetworkPrinter(printer)) {
      Alert.alert('USB printers', 'USB test print requires the Windows print bridge.');
      return;
    }
    const id = String(printer._id);
    setBusyId(id);
    try {
      const result = await printerService.testPrinterDirect(printer);
      setMessage(result.message || (result.success ? 'Test sent.' : 'Test failed.'));
      if (result.success) {
        setResult(id, {
          status: 'ONLINE',
          host: printer.host,
          port: printer.port || config.DEFAULT_PRINTER_PORT,
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
    const res = await updateAdminPrinter(String(printer._id), {
      name: printer.name,
      target: printer.target,
      purpose: printer.target,
      connectionType:
        String(printer.connectionType || 'NETWORK').toUpperCase() === 'USB'
          ? 'USB'
          : 'NETWORK',
      host: printer.host,
      ipAddress: printer.host,
      port: printer.port || config.DEFAULT_PRINTER_PORT,
      systemPrinterName: printer.systemPrinterName,
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

  const applyDiscovered = (item: DiscoveredPrinter) => {
    setForm((prev) => ({
      ...prev,
      host: item.host,
      port: String(item.port),
      name: prev.name || `Network Printer ${item.host}`,
    }));
    setShowForm(true);
    setMessage(`Selected ${item.host}:${item.port}. Assign a purpose and save.`);
  };

  const startScan = async () => {
    const inferred =
      subnetPrefixFromHost(form.host) ||
      subnetPrefixFromHost(sorted.find((p) => p.host)?.host) ||
      scanPrefix;
    const prefix = (scanPrefix || inferred).trim().replace(/\.$/, '');
    setScanPrefix(prefix);
    scanCancelRef.current = {cancelled: false};
    setScanning(true);
    setDiscovered([]);
    setScanProgress({done: 0, total: 0});
    setError(null);
    setMessage('Scanning local network (best effort)…');
    try {
      const found = await scanSubnetForPrinters({
        subnetPrefix: prefix,
        port: config.DEFAULT_PRINTER_PORT,
        signal: scanCancelRef.current,
        onProgress: (done, total) => setScanProgress({done, total}),
      });
      if (scanCancelRef.current.cancelled) {
        setMessage('Scan cancelled.');
        return;
      }
      setDiscovered(found);
      setMessage(
        found.length
          ? `Found ${found.length} printer(s) on port ${config.DEFAULT_PRINTER_PORT}.`
          : `No printers found on ${prefix}.x:${config.DEFAULT_PRINTER_PORT}. Enter IP manually.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const stopScan = () => {
    scanCancelRef.current.cancelled = true;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
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
      <Text style={styles.title}>Printers</Text>
      <Text style={styles.subtitle}>
        Network / Wi‑Fi thermal printers on the restaurant LAN. Configure once;
        daily use only needs power and the Sales app open.
      </Text>

      {!canEdit ? (
        <Text style={styles.hint}>
          Status is visible to all staff. Admin or Manager can add or edit printers.
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {sorted.map((printer) => {
        const status = resolveStatus(printer);
        const live = liveById[String(printer._id)];
        const hostLine = isNetworkPrinter(printer)
          ? `${printer.host}:${printer.port || config.DEFAULT_PRINTER_PORT}`
          : printer.systemPrinterName || 'USB';
        const busy = busyId === String(printer._id);

        return (
          <View key={printer._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{flex: 1}}>
                <Text style={styles.cardTitle}>
                  {TARGET_OPTIONS.find((t) => t.value === printer.target)?.label ||
                    printer.target}
                </Text>
                <Text style={styles.cardName}>{printer.name}</Text>
                <Text style={styles.cardMeta}>{hostLine}</Text>
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
                  style={[styles.statusDot, {backgroundColor: statusColor(status)}]}
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
                    printer.enabled !== false ? colors.primary : colors.textSecondary
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
          No printers configured yet. Add a network printer with its IP address.
        </Text>
      ) : null}

      {canEdit ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scan network</Text>
            <Text style={styles.hint}>
              Best-effort TCP scan on port {config.DEFAULT_PRINTER_PORT}. Some routers
              block discovery — manual IP always works.
            </Text>
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
                disabled={scanning}
                onPress={() => void startScan()}>
                <Text style={styles.btnPrimaryText}>
                  {scanning
                    ? `Scanning ${scanProgress.done}/${scanProgress.total || '…'}`
                    : 'Scan Network'}
                </Text>
              </Pressable>
              {scanning ? (
                <Pressable
                  style={[styles.btn, styles.btnSecondary]}
                  onPress={stopScan}>
                  <Text style={styles.btnSecondaryText}>Stop</Text>
                </Pressable>
              ) : null}
            </View>
            {discovered.map((d) => (
              <Pressable
                key={`${d.host}:${d.port}`}
                style={styles.discoveredRow}
                onPress={() => applyDiscovered(d)}>
                <Text style={styles.cardName}>{d.host}</Text>
                <Text style={styles.cardMeta}>
                  Port {d.port} · Tap to use
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.btn, styles.btnPrimary, styles.addBtn]}
            onPress={openCreate}>
            <Text style={styles.btnPrimaryText}>Add Printer</Text>
          </Pressable>

          {showForm ? (
            <View style={styles.form}>
              <Text style={styles.sectionTitle}>
                {editId ? 'Edit printer' : 'New network printer'}
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
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Enabled</Text>
                <Switch
                  value={form.enabled}
                  onValueChange={(enabled) => setForm((p) => ({...p, enabled}))}
                  trackColor={{false: colors.border, true: colors.primaryLight}}
                  thumbColor={form.enabled ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.row}>
                <Pressable
                  style={[styles.btn, styles.btnSecondary, {flex: 1}]}
                  onPress={() => {
                    setShowForm(false);
                    setEditId(null);
                  }}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
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
            </View>
          ) : null}
        </>
      ) : null}

      <Text style={styles.footerNote}>
        Tip: reserve the printer IP in your router DHCP so it does not change after
        restarts.
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
  section: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
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
  footerNote: {
    marginTop: 20,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
