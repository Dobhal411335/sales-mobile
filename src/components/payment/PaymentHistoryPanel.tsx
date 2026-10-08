import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Check} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {PaymentSplitDraft} from '../../types/payment';
import {formatCurrency} from '../../utils/currency';
import {roundMoney} from '../../utils/receiptFormat';

type Tone = 'green' | 'orange' | 'emerald' | 'amber' | 'default';

export interface HistoryLineItem {
  id: string;
  label: string;
  value: string;
  tone?: Tone;
  strong?: boolean;
}

interface PaymentHistoryPanelProps {
  billMode: 'full' | 'split';
  historyLines: HistoryLineItem[];
  billTotal: number;
  billTotalLabel?: string;
  giftCoversSplitBill?: boolean;
  paymentSplits?: PaymentSplitDraft[];
  selectedSplitId?: string | null;
  onSelectSplit?: (id: string) => void;
  splitRemaining?: number;
}

function HistoryLine({
  label,
  value,
  tone = 'default',
  strong,
}: {
  label: string;
  value: string;
  tone?: Tone;
  strong?: boolean;
}) {
  const valueColor =
    tone === 'green'
      ? '#15803D'
      : tone === 'orange'
        ? '#C2410C'
        : tone === 'emerald'
          ? '#047857'
          : tone === 'amber'
            ? '#B45309'
            : colors.text;

  return (
    <View style={[styles.historyLine, strong && styles.historyLineStrong]}>
      <Text style={styles.historyLabel}>{label}</Text>
      <Text style={[styles.historyValue, {color: valueColor}]}>{value}</Text>
    </View>
  );
}

function isRowReady(row: PaymentSplitDraft): boolean {
  const nameOk = String(row.name || '').trim().length > 0;
  const amt = parseFloat(row.amount);
  const amtOk = Number.isFinite(amt) && amt > 0;
  const methodOk = row.method === 'Cash' || row.method === 'Card';
  const cardOk =
    row.method !== 'Card' || Boolean(String(row.cardType || '').trim());
  return nameOk && amtOk && methodOk && cardOk;
}

export function PaymentHistoryPanel({
  billMode,
  historyLines,
  billTotal,
  billTotalLabel = 'Bill total',
  giftCoversSplitBill = false,
  paymentSplits = [],
  selectedSplitId = null,
  onSelectSplit,
  splitRemaining = 0,
}: PaymentHistoryPanelProps) {
  const title =
    billMode === 'split' ? 'Payment groups' : 'Payment history';
  const subtitle =
    billMode === 'split'
      ? 'Select a seat/group to configure tender'
      : 'Live tender breakdown';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {billMode === 'full' ? (
          <>
            {historyLines.map((line) => (
              <HistoryLine
                key={line.id}
                label={line.label}
                value={line.value}
                tone={line.tone}
                strong={line.strong}
              />
            ))}
            <View style={styles.billTotalBox}>
              <Text style={styles.billTotalLabel}>{billTotalLabel}</Text>
              <Text style={styles.billTotalValue}>
                {formatCurrency(billTotal)}
              </Text>
            </View>
          </>
        ) : giftCoversSplitBill ? (
          <View style={styles.giftCoverBox}>
            <Text style={styles.giftCoverTitle}>
              Gift card covers the full bill. No payer groups needed.
            </Text>
          </View>
        ) : (
          <>
            {paymentSplits.map((row, idx) => {
              const selected = selectedSplitId === row.id;
              const ready = isRowReady(row);
              const amount = roundMoney(parseFloat(row.amount) || 0);
              const seatLabel =
                row.seatNumber === null
                  ? 'Table'
                  : row.seatNumber != null
                    ? `Seat ${row.seatNumber}`
                    : null;
              return (
                <Pressable
                  key={row.id}
                  style={[
                    styles.splitCard,
                    selected && styles.splitCardSelected,
                  ]}
                  onPress={() => onSelectSplit?.(row.id)}
                  accessibilityRole="button"
                  accessibilityState={{selected}}>
                  <View style={styles.splitCardTop}>
                    <Text style={styles.splitName} numberOfLines={1}>
                      {String(row.name || '').trim() ||
                        seatLabel ||
                        `Payer ${idx + 1}`}
                    </Text>
                    <View
                      style={[
                        styles.readyBadge,
                        ready ? styles.readyOk : styles.readyPending,
                      ]}>
                      {ready ? (
                        <Check color="#15803D" size={12} strokeWidth={3} />
                      ) : null}
                      <Text
                        style={[
                          styles.readyText,
                          ready ? styles.readyTextOk : styles.readyTextPending,
                        ]}>
                        {ready ? 'Ready' : 'Setup'}
                      </Text>
                    </View>
                  </View>
                  {seatLabel ? (
                    <Text style={styles.seatMeta}>{seatLabel}</Text>
                  ) : null}
                  <View style={styles.splitMetaRow}>
                    <Text style={styles.splitMethod}>
                      {row.method}
                      {row.cardType ? ` · ${row.cardType}` : ''}
                    </Text>
                    <Text style={styles.splitAmount}>
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <HistoryLine
              label={
                Math.abs(splitRemaining) < 0.01
                  ? 'Balanced'
                  : splitRemaining > 0
                    ? 'Remaining'
                    : 'Over'
              }
              value={formatCurrency(Math.abs(splitRemaining))}
              tone={Math.abs(splitRemaining) < 0.01 ? 'green' : 'amber'}
              strong
            />
            <View style={styles.billTotalBox}>
              <Text style={styles.billTotalLabel}>{billTotalLabel}</Text>
              <Text style={styles.billTotalValue}>
                {formatCurrency(billTotal)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 8,
  },
  historyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyLineStrong: {
    backgroundColor: '#FFFBEB',
  },
  historyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  billTotalBox: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
  },
  billTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  giftCoverBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    padding: 16,
  },
  giftCoverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14532D',
  },
  splitCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  splitCardSelected: {
    borderColor: '#FB923C',
    backgroundColor: '#FFF7ED',
  },
  splitCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  splitName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  readyOk: {
    backgroundColor: '#DCFCE7',
  },
  readyPending: {
    backgroundColor: '#F4F4F5',
  },
  readyText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  readyTextOk: {
    color: '#15803D',
  },
  readyTextPending: {
    color: colors.textSecondary,
  },
  seatMeta: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  splitMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  splitMethod: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  splitAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
