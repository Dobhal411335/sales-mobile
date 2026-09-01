import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {PrintJob} from '../../types/printJob';
import {
  employeeLabel,
  formatPrintJobListTime,
  orderLabel,
  printTypeLabel,
  printerTargetLabel,
  tableLabel,
} from '../../utils/printJobDisplay';
import {PrintJobStatusBadge} from './PrintJobStatusBadge';

interface PrintJobCardProps {
  job: PrintJob;
  selected?: boolean;
  actionBusy?: boolean;
  onPress: (job: PrintJob) => void;
  onView?: (job: PrintJob) => void;
  onRetry?: (job: PrintJob) => void;
}

export function PrintJobCard({
  job,
  selected = false,
  actionBusy = false,
  onPress,
  onView,
  onRetry,
}: PrintJobCardProps) {
  const orderNo = orderLabel(job);
  const table = tableLabel(job);
  const employee = employeeLabel(job.requestedBy);
  const isFailed = job.status === 'FAILED';
  const showQuickActions = isFailed && (onView || onRetry);

  return (
    <Pressable
      style={({pressed}) => [
        styles.card,
        selected && styles.cardSelected,
        isFailed && styles.cardFailed,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(job)}
      accessibilityRole="button"
      accessibilityState={{selected}}
      accessibilityLabel={`${printTypeLabel(job.printType)} order ${orderNo}`}>
      <View style={styles.headerRow}>
        <Text style={styles.typeLabel}>{printTypeLabel(job.printType)}</Text>
        <PrintJobStatusBadge status={job.status} compact />
      </View>

      <Text style={styles.orderLine} numberOfLines={1}>
        Order #{orderNo}
        {table ? ` · ${table}` : ''}
      </Text>

      <Text style={styles.metaLine} numberOfLines={1}>
        {printerTargetLabel(job.printerTarget)} ·{' '}
        {formatPrintJobListTime(job.createdAt)}
      </Text>

      {employee !== '—' ? (
        <Text style={styles.employeeLine} numberOfLines={1}>
          {employee}
        </Text>
      ) : null}

      {showQuickActions ? (
        <View style={styles.quickActions}>
          {onRetry ? (
            <Pressable
              style={({pressed}) => [
                styles.actionButton,
                styles.retryButton,
                pressed && styles.actionButtonPressed,
                actionBusy && styles.actionButtonDisabled,
              ]}
              onPress={(event) => {
                event.stopPropagation();
                if (!actionBusy) {
                  onRetry(job);
                }
              }}
              disabled={actionBusy}
              accessibilityRole="button"
              accessibilityLabel="Retry print job">
              {actionBusy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.retryButtonText}>Retry</Text>
              )}
            </Pressable>
          ) : null}
          {onView ? (
            <Pressable
              style={({pressed}) => [
                styles.actionButton,
                styles.viewButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={(event) => {
                event.stopPropagation();
                onView(job);
              }}
              accessibilityRole="button"
              accessibilityLabel="View print job">
              <Text style={styles.viewButtonText}>View</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardSelected: {
    backgroundColor: colors.cream,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 13,
  },
  cardFailed: {
    backgroundColor: '#FEF2F2',
  },
  cardPressed: {
    backgroundColor: '#F4F4F5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  orderLine: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  metaLine: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  employeeLine: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  retryButton: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  viewButton: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});
