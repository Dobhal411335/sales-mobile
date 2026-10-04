import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Monitor, RefreshCw, Send} from 'lucide-react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../../constants/colors';
import {config} from '../../../constants/config';
import {
  clearCustomerDisplay,
  formatMoneyForDisplay,
  getCustomerDisplays,
  isCustomerDisplayAvailable,
  isCustomerDisplayModuleReady,
  showCustomerDisplay,
} from '../../../display/customerDisplay';
import {
  DEFAULT_CUSTOMER_DISPLAY_SETTINGS,
  getCustomerDisplaySettings,
  hydrateCustomerDisplaySettings,
  subscribeCustomerDisplaySettings,
  updateCustomerDisplaySettings,
  type CustomerDisplaySettings,
} from '../../../display/customerDisplaySettings';
import type {SalesStackParamList} from '../../../navigation/types';

type Props = NativeStackScreenProps<SalesStackParamList, 'CustomerDisplaySettings'>;

const SAMPLE_LINES = [
  {name: 'Butter Chicken', qty: 1, priceText: formatMoneyForDisplay(16.99)},
  {name: 'Garlic Naan', qty: 2, priceText: formatMoneyForDisplay(7.0)},
  {name: 'Mango Lassi', qty: 1, priceText: formatMoneyForDisplay(4.5)},
];
const SAMPLE_TOTAL = 28.49;

export function CustomerDisplaySettingsScreen(_props: Props) {
  const [settings, setSettings] = useState<CustomerDisplaySettings>(
    DEFAULT_CUSTOMER_DISPLAY_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Checking secondary display…');
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const brandPreview = useMemo(
    () => settings.brand.trim() || config.APP_NAME.toUpperCase(),
    [settings.brand],
  );

  const refreshAvailability = useCallback(async () => {
    if (!isCustomerDisplayModuleReady()) {
      setDisplayName(null);
      setStatusText(
        'Customer display module not linked — rebuild Android (npm run android).',
      );
      return;
    }
    const info = await isCustomerDisplayAvailable();
    const all = await getCustomerDisplays();
    if (info.available) {
      setDisplayName(info.name || `Display #${info.displayId}`);
      setStatusText(
        `Secondary screen ready (${all.length} display(s) total). Cart totals push automatically while Sales is open.`,
      );
    } else {
      setDisplayName(null);
      setStatusText(
        info.error ||
          'No secondary customer screen detected. Normal on emulator / single-display tablets.',
      );
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const loaded = await hydrateCustomerDisplaySettings();
      if (!alive) return;
      setSettings(loaded);
      setLoading(false);
      await refreshAvailability();
    })();
    const unsub = subscribeCustomerDisplaySettings(() => {
      setSettings(getCustomerDisplaySettings());
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [refreshAvailability]);

  const patch = useCallback(async (partial: Partial<CustomerDisplaySettings>) => {
    const next = await updateCustomerDisplaySettings(partial);
    setSettings(next);
  }, []);

  const pushSample = useCallback(
    async (mode: 'cart' | 'paid') => {
      setBusy(true);
      setMessage(null);
      try {
        if (!settings.enabled) {
          setMessage('Enable customer display first.');
          return;
        }
        const result = await showCustomerDisplay({
          brand: brandPreview,
          title: mode === 'paid' ? 'Payment received' : 'Your order',
          totalLabel: mode === 'paid' ? 'PAID' : 'TOTAL',
          totalText: formatMoneyForDisplay(SAMPLE_TOTAL),
          footer: mode === 'paid' ? settings.paidFooter : settings.cartFooter,
          mode,
          lines: settings.showLineItems ? SAMPLE_LINES : [],
        });
        if (!result.success) {
          setMessage(result.error || 'Could not update secondary display.');
        } else {
          setMessage(
            mode === 'paid'
              ? 'Sample paid receipt sent to customer screen.'
              : 'Sample cart sent to customer screen.',
          );
        }
      } finally {
        setBusy(false);
      }
    },
    [brandPreview, settings],
  );

  const clearDisplay = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      await clearCustomerDisplay();
      setMessage('Customer display cleared.');
    } finally {
      setBusy(false);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Customer display</Text>
        <Text style={styles.subtitle}>
          Controls the rear / secondary screen on dual-display POS tablets. Totals
          follow the live cart; use this page to preview and tune what guests see.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Monitor size={18} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>Hardware</Text>
            <Pressable
              onPress={() => void refreshAvailability()}
              style={styles.iconBtn}
              accessibilityLabel="Refresh display status">
              <RefreshCw size={16} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.status}>{statusText}</Text>
          {displayName ? (
            <Text style={styles.displayName}>{displayName}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Options</Text>

          <View style={styles.switchRow}>
            <View style={{flex: 1}}>
              <Text style={styles.label}>Show on secondary screen</Text>
              <Text style={styles.hint}>
                Off keeps the guest screen idle / cleared.
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(enabled) => void patch({enabled})}
              trackColor={{false: colors.border, true: colors.primaryLight}}
              thumbColor={settings.enabled ? colors.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{flex: 1}}>
              <Text style={styles.label}>Show line items</Text>
              <Text style={styles.hint}>
                When off, guests only see the running total.
              </Text>
            </View>
            <Switch
              value={settings.showLineItems}
              onValueChange={(showLineItems) => void patch({showLineItems})}
              trackColor={{false: colors.border, true: colors.primaryLight}}
              thumbColor={settings.showLineItems ? colors.primary : '#f4f3f4'}
            />
          </View>

          <Text style={styles.label}>Brand on display</Text>
          <TextInput
            style={styles.input}
            value={settings.brand}
            onChangeText={(brand) => setSettings((p) => ({...p, brand}))}
            onEndEditing={() => void patch({brand: settings.brand})}
            placeholder={config.APP_NAME.toUpperCase()}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Cart footer</Text>
          <TextInput
            style={styles.input}
            value={settings.cartFooter}
            onChangeText={(cartFooter) =>
              setSettings((p) => ({...p, cartFooter}))
            }
            onEndEditing={() => void patch({cartFooter: settings.cartFooter})}
            placeholder="Thank you"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Paid footer</Text>
          <TextInput
            style={styles.input}
            value={settings.paidFooter}
            onChangeText={(paidFooter) =>
              setSettings((p) => ({...p, paidFooter}))
            }
            onEndEditing={() => void patch({paidFooter: settings.paidFooter})}
            placeholder="Thank you — please come again"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preview (this tablet)</Text>
          <Text style={styles.hint}>
            Approximate guest view. Tap Send sample to push to the real secondary
            screen when available.
          </Text>
          <View style={styles.preview}>
            <Text style={styles.previewBrand}>{brandPreview}</Text>
            <Text style={styles.previewTitle}>Your order</Text>
            {settings.showLineItems
              ? SAMPLE_LINES.map((line) => (
                  <View key={line.name} style={styles.previewLine}>
                    <Text style={styles.previewItem} numberOfLines={1}>
                      {line.qty}× {line.name}
                    </Text>
                    <Text style={styles.previewPrice}>{line.priceText}</Text>
                  </View>
                ))
              : null}
            <View style={styles.previewTotalRow}>
              <Text style={styles.previewTotalLabel}>TOTAL</Text>
              <Text style={styles.previewTotal}>
                {formatMoneyForDisplay(SAMPLE_TOTAL)}
              </Text>
            </View>
            <Text style={styles.previewFooter}>{settings.cartFooter}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => void pushSample('cart')}>
              <Send size={16} color={colors.surface} />
              <Text style={styles.btnPrimaryText}>Send sample cart</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnOutline, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => void pushSample('paid')}>
              <Text style={styles.btnOutlineText}>Send paid sample</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnOutline, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={() => void clearDisplay()}>
              <Text style={styles.btnOutlineText}>Clear display</Text>
            </Pressable>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: 16, paddingBottom: 40, gap: 12},
  loadingBox: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  iconBtn: {marginLeft: 'auto', padding: 6},
  cardTitle: {
    fontSize: 16,
    fontWeight: '650',
    color: colors.text,
  },
  status: {fontSize: 13, color: colors.textSecondary, lineHeight: 18},
  displayName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  hint: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.cream,
  },
  preview: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  previewBrand: {
    color: '#FDBA74',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  previewTitle: {
    color: '#E5E7EB',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  previewLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewItem: {flex: 1, color: '#F3F4F6', fontSize: 13},
  previewPrice: {color: '#D1D5DB', fontSize: 13},
  previewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#374151',
    paddingTop: 10,
    marginTop: 4,
  },
  previewTotalLabel: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '700',
  },
  previewTotal: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '800',
  },
  previewFooter: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  actions: {gap: 8, marginTop: 4},
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnPrimary: {backgroundColor: colors.primary},
  btnPrimaryText: {color: colors.surface, fontWeight: '700', fontSize: 14},
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  btnOutlineText: {color: colors.text, fontWeight: '600', fontSize: 14},
  btnDisabled: {opacity: 0.55},
  message: {fontSize: 13, color: colors.success, marginTop: 4},
});
