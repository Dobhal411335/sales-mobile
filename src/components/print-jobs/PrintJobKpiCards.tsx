import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CircleCheck,
  Printer,
  Receipt,
  RotateCcw,
  TriangleAlert,
  UtensilsCrossed,
  Wine,
} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {PrintJobStats} from '../../types/printJob';

interface PrintJobKpiCardsProps {
  stats: PrintJobStats | null;
  jobsCount: number;
  loading: boolean;
  activeStatusFilter: string;
  activeTypeFilter: string;
  reprintOnly: boolean;
  onSelectTotal: () => void;
  onSelectReceipt: () => void;
  onSelectKot: () => void;
  onSelectBar: () => void;
  onSelectReprint: () => void;
  onSelectPrinted: () => void;
  onSelectFailed: () => void;
}

export function PrintJobKpiCards({
  stats,
  jobsCount,
  loading,
  activeStatusFilter,
  activeTypeFilter,
  reprintOnly,
  onSelectTotal,
  onSelectReceipt,
  onSelectKot,
  onSelectBar,
  onSelectReprint,
  onSelectPrinted,
  onSelectFailed,
}: PrintJobKpiCardsProps) {
  const total = stats?.total ?? jobsCount;
  const receipt = stats?.receiptCount ?? 0;
  const kot = stats?.kotCount ?? 0;
  const bar = stats?.barCount ?? 0;
  const reprint = stats?.reprintCount ?? 0;
  const printed = stats?.printedCount ?? 0;
  const failed = stats?.failedCount ?? 0;

  const receiptPct = total > 0 ? Math.round((receipt / total) * 100) : 0;
  const kotPct = total > 0 ? Math.round((kot / total) * 100) : 0;
  const barPct = total > 0 ? Math.round((bar / total) * 100) : 0;
  const reprintPct =
    total > 0
      ? ((reprint / total) * 100).toFixed(1).replace(/\.0$/, '')
      : '0';
  const printedPct = total > 0 ? Math.round((printed / total) * 100) : 0;
  const failedPct = total > 0 ? Math.round((failed / total) * 100) : 0;

  const isTotalActive =
    activeStatusFilter === 'ALL' &&
    activeTypeFilter === 'ALL' &&
    !reprintOnly;

  const cards = [
    {
      key: 'TOTAL',
      label: 'TOTAL PRINTS',
      value: String(total),
      percent: '100%',
      Icon: Printer,
      active: isTotalActive,
      onPress: onSelectTotal,
    },
    {
      key: 'RECEIPT',
      label: 'BILL RECEIPT',
      value: String(receipt),
      percent: `${receiptPct}%`,
      Icon: Receipt,
      active: activeTypeFilter === 'RECEIPT' && !reprintOnly,
      onPress: onSelectReceipt,
    },
    {
      key: 'KOT',
      label: 'KITCHEN (KOT)',
      value: String(kot),
      percent: `${kotPct}%`,
      Icon: UtensilsCrossed,
      active: activeTypeFilter === 'KOT' && !reprintOnly,
      onPress: onSelectKot,
    },
    {
      key: 'BAR_RECEIPT',
      label: 'BAR RECEIPT',
      value: String(bar),
      percent: `${barPct}%`,
      Icon: Wine,
      active: activeTypeFilter === 'BAR_RECEIPT' && !reprintOnly,
      onPress: onSelectBar,
    },
    {
      key: 'REPRINT',
      label: 'REPRINTS',
      value: String(reprint),
      percent: `${reprintPct}%`,
      Icon: RotateCcw,
      active: reprintOnly,
      onPress: onSelectReprint,
    },
    {
      key: 'PRINTED',
      label: 'PRINTED OK',
      value: String(printed),
      percent: `${printedPct}%`,
      Icon: CircleCheck,
      active: activeStatusFilter === 'PRINTED' && !reprintOnly,
      onPress: onSelectPrinted,
    },
    {
      key: 'FAILED',
      label: 'FAILED JOBS',
      value: String(failed),
      percent: `${failedPct}%`,
      Icon: TriangleAlert,
      active: activeStatusFilter === 'FAILED' && !reprintOnly,
      onPress: onSelectFailed,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {cards.map((card) => {
          const {key, label, value, percent, Icon, active, onPress} = card;
          return (
            <Pressable
              key={key}
              style={({pressed}) => [
                styles.card,
                active && styles.cardActive,
                pressed && styles.cardPressed,
              ]}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              accessibilityLabel={`${label}: ${value}`}>
              <View style={styles.iconBox}>
                <Icon size={16} color={colors.surface} strokeWidth={2.4} />
              </View>
              <View style={styles.textBox}>
                <View style={styles.labelRow}>
                  <Text style={styles.label} numberOfLines={1}>
                    {label}
                  </Text>
                  {!loading && (
                    <Text style={styles.percentText} numberOfLines={1}>
                      · {percent}
                    </Text>
                  )}
                </View>
                <Text style={styles.value} numberOfLines={1}>
                  {loading ? '—' : value}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
    minWidth: 154,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  percentText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
});
