import React, {useMemo} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Plus, Trash2} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {CardTypeName, PaymentSplitDraft} from '../../types/payment';
import {formatCurrency} from '../../utils/currency';
import {roundMoney} from '../../utils/receiptFormat';
import {CardTypeSelector} from './CardTypeSelector';
import {buildSeatSplitRows, groupItemsBySeat} from '../../utils/seatHelpers';
import type {CartLineItem} from '../../types/cart';

export type SplitMode = 'custom' | 'by_seat';

interface SplitBillEditorProps {
  splitDue: number;
  giftUsed: number;
  rows: PaymentSplitDraft[];
  onChangeRows: (rows: PaymentSplitDraft[]) => void;
  splitMode?: SplitMode;
  onSplitModeChange?: (mode: SplitMode) => void;
  orderItems?: CartLineItem[];
  selectedId?: string | null;
  onSelectRow?: (id: string) => void;
}

function makeRow(
  index: number,
  partial?: Partial<PaymentSplitDraft>,
): PaymentSplitDraft {
  return {
    id: `split-${Date.now()}-${index}`,
    name: '',
    amount: '',
    method: 'Card',
    cardType: '',
    ...partial,
  };
}

export function createDefaultSplitRows(): PaymentSplitDraft[] {
  return [makeRow(0), makeRow(1)];
}

export function SplitBillEditor({
  splitDue,
  giftUsed,
  rows,
  onChangeRows,
  splitMode = 'custom',
  onSplitModeChange,
  orderItems = [],
  selectedId = null,
  onSelectRow,
}: SplitBillEditorProps) {
  const allocated = useMemo(
    () =>
      roundMoney(
        rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0),
      ),
    [rows],
  );
  const remaining = roundMoney(splitDue - allocated);
  const giftCovers = giftUsed > 0 && splitDue < 0.01;
  const balanced = Math.abs(remaining) < 0.01;
  const canSplitBySeat = groupItemsBySeat(orderItems).length >= 2;
  const isBySeat = splitMode === 'by_seat';

  const applySeatSplits = () => {
    const seatRows = buildSeatSplitRows({
      items: orderItems,
      totalAmount: splitDue,
    });
    if (seatRows.length < 2) {
      return;
    }
    onChangeRows(
      seatRows.map((row, i) => ({
        id: `seat-split-${row.seatNumber ?? 'table'}-${i}`,
        name: row.name,
        amount: Number(row.amount || 0).toFixed(2),
        method: 'Card' as const,
        cardType: '',
        seatNumber: row.seatNumber,
      })),
    );
  };

  const updateRow = (id: string, patch: Partial<PaymentSplitDraft>) => {
    onChangeRows(rows.map((row) => (row.id === id ? {...row, ...patch} : row)));
  };

  const addRow = () => {
    onChangeRows([...rows, makeRow(rows.length)]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 2) {
      return;
    }
    onChangeRows(rows.filter((row) => row.id !== id));
  };

  const splitEqually = (count: number) => {
    const n = Math.max(2, Math.min(12, Number(count) || 2));
    const each = Math.floor((splitDue * 100) / n) / 100;
    const last = roundMoney(splitDue - each * (n - 1));
    onChangeRows(
      Array.from({length: n}, (_, i) => ({
        id: `split-${Date.now()}-${i}`,
        name: rows[i]?.name || `Guest ${String.fromCharCode(65 + i)}`,
        amount: (i === n - 1 ? last : each).toFixed(2),
        method: rows[i]?.method || 'Card',
        cardType: rows[i]?.cardType || '',
      })),
    );
  };

  const fillRemainingOnLast = () => {
    if (rows.length === 0) {
      return;
    }
    const lastId = rows[rows.length - 1].id;
    const others = rows
      .slice(0, -1)
      .reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    const fill = roundMoney(Math.max(0, splitDue - others));
    updateRow(lastId, {amount: fill.toFixed(2)});
  };

  if (giftCovers) {
    return (
      <View style={styles.container}>
        <View style={styles.coveredBox}>
          <Text style={styles.coveredTitle}>Gift card covers the full bill</Text>
          <Text style={styles.coveredBody}>
            No named payers needed — one Gift Card payment will be recorded.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, !isBySeat && styles.modeChipActive]}
          onPress={() => {
            onSplitModeChange?.('custom');
            onChangeRows(createDefaultSplitRows());
          }}>
          <Text style={[styles.modeChipText, !isBySeat && styles.modeChipTextActive]}>
            Custom
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.modeChip,
            isBySeat && styles.modeChipActive,
            !canSplitBySeat && styles.modeChipDisabled,
          ]}
          disabled={!canSplitBySeat}
          onPress={() => {
            onSplitModeChange?.('by_seat');
            applySeatSplits();
          }}>
          <Text
            style={[
              styles.modeChipText,
              isBySeat && styles.modeChipTextActive,
            ]}>
            By seat
          </Text>
        </Pressable>
      </View>

      {isBySeat ? (
        <View style={styles.helperRow}>
          <Pressable
            style={styles.helperBtn}
            onPress={applySeatSplits}
            accessibilityRole="button"
            accessibilityLabel="Recalculate seat splits">
            <Text style={styles.helperBtnText}>Recalc seats</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.helperRow}>
          <Pressable
            style={styles.helperBtn}
            onPress={() => splitEqually(rows.length)}
            accessibilityRole="button"
            accessibilityLabel="Split equally">
            <Text style={styles.helperBtnText}>Equal ({rows.length})</Text>
          </Pressable>
          <Pressable
            style={styles.helperBtn}
            onPress={() => splitEqually(rows.length + 1)}
            accessibilityRole="button"
            accessibilityLabel="Add one equal share">
            <Text style={styles.helperBtnText}>+1 Equal</Text>
          </Pressable>
          <Pressable
            style={styles.helperBtn}
            onPress={fillRemainingOnLast}
            accessibilityRole="button"
            accessibilityLabel="Fill remaining on last payer">
            <Text style={styles.helperBtnText}>Fill last</Text>
          </Pressable>
          <Pressable
            style={styles.helperBtn}
            onPress={addRow}
            accessibilityRole="button"
            accessibilityLabel="Add payer">
            <Plus size={14} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.helperBtnText}>Payer</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Due (after gift)</Text>
          <Text style={styles.summaryValue}>{formatCurrency(splitDue)}</Text>
        </View>
        {giftUsed > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gift card</Text>
            <Text style={styles.summaryValueMuted}>
              −{formatCurrency(giftUsed)}
            </Text>
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Allocated</Text>
          <Text style={styles.summaryValue}>{formatCurrency(allocated)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryLabel,
              balanced ? styles.balanced : styles.unbalanced,
            ]}>
            {balanced ? 'Balanced' : remaining > 0 ? 'Remaining' : 'Over'}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              balanced ? styles.balanced : styles.unbalanced,
            ]}>
            {formatCurrency(Math.abs(remaining))}
          </Text>
        </View>
      </View>

      {rows.map((row, index) => (
        <Pressable
          key={row.id}
          style={[
            styles.rowCard,
            selectedId === row.id && styles.rowCardSelected,
          ]}
          onPress={() => onSelectRow?.(row.id)}
          accessibilityRole="button"
          accessibilityState={{selected: selectedId === row.id}}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>
              {isBySeat ? row.name || `Seat ${index + 1}` : `Payer ${index + 1}`}
            </Text>
            {!isBySeat && rows.length > 2 ? (
              <Pressable
                onPress={() => removeRow(row.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove payer ${index + 1}`}>
                <Trash2 size={16} color={colors.error} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.fieldLabel}>NAME (on receipt)</Text>
          <TextInput
            style={styles.input}
            value={row.name}
            onChangeText={(name) => updateRow(row.id, {name})}
            placeholder={
              isBySeat
                ? 'Seat / payer name (prints as Party)'
                : `Guest ${String.fromCharCode(65 + index)}`
            }
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            accessibilityLabel="Payer name prints as Party"
          />

          <Text style={styles.fieldLabel}>AMOUNT</Text>
          <TextInput
            style={styles.input}
            value={row.amount}
            onChangeText={(amount) => updateRow(row.id, {amount})}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>METHOD</Text>
          <View style={styles.methodRow}>
            {(['Card', 'Cash'] as const).map((method) => {
              const selected = row.method === method;
              return (
                <Pressable
                  key={method}
                  style={[
                    styles.methodChip,
                    selected && styles.methodChipSelected,
                  ]}
                  onPress={() =>
                    updateRow(row.id, {
                      method,
                      cardType: method === 'Cash' ? '' : row.cardType,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityState={{selected}}>
                  <Text
                    style={[
                      styles.methodChipText,
                      selected && styles.methodChipTextSelected,
                    ]}>
                    {method}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {row.method === 'Card' ? (
            <CardTypeSelector
              selected={(row.cardType as CardTypeName) || ''}
              onSelect={(cardType) => updateRow(row.id, {cardType})}
            />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  helperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  helperBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
  },
  modeChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipActive: {
    backgroundColor: colors.surface,
  },
  modeChipDisabled: {
    opacity: 0.4,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  modeChipTextActive: {
    color: colors.text,
  },
  summaryBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#FAFAFA',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  summaryValueMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  balanced: {
    color: '#059669',
  },
  unbalanced: {
    color: '#DC2626',
  },
  rowCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: colors.surface,
  },
  rowCardSelected: {
    borderColor: '#FB923C',
    backgroundColor: '#FFF7ED',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: '#FAFAFA',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  methodChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  methodChipTextSelected: {
    color: colors.primary,
  },
  coveredBox: {
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  coveredTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  coveredBody: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 18,
  },
});
