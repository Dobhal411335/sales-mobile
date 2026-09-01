import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {EodExportKind, EodHistoryRow} from '../../types/eod';
import {formatReportMoney} from '../../utils/eodFormat';
import {colors} from '../../constants/colors';

interface SavedReportsHistoryProps {
  history: EodHistoryRow[];
  loading: boolean;
  onRefresh: () => void;
  onView: (businessDate: string) => void;
  onExport: (businessDate: string, kind: EodExportKind) => void;
}

export function SavedReportsHistory({
  history,
  loading,
  onRefresh,
  onView,
  onExport,
}: SavedReportsHistoryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Reports</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Refresh saved reports">
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.refreshText}>↻</Text>
          )}
        </Pressable>
      </View>

      {history.length === 0 ? (
        <Text style={styles.empty}>No saved reports yet.</Text>
      ) : (
        history.map((row) => (
          <View key={row.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.date}>{row.businessDate}</Text>
              <Text style={styles.meta}>
                Net {row.netSales != null ? formatReportMoney(row.netSales) : '—'} ·{' '}
                {row.generatedByName ?? '—'}
              </Text>
              <Text style={styles.meta}>
                Saved{' '}
                {row.generatedAt
                  ? new Date(row.generatedAt).toLocaleString()
                  : '—'}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <Pressable
                style={styles.actionChip}
                onPress={() => onView(row.businessDate)}>
                <Text style={styles.actionChipText}>View</Text>
              </Pressable>
              <Pressable
                style={styles.actionChip}
                onPress={() => onExport(row.businessDate, 'excel')}>
                <Text style={styles.actionChipText}>Excel</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  empty: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionChip: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
