import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Eye, Printer, RotateCcw} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {PrintJob, PrintType} from '../../types/printJob';
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
  onPrintAgain?: (job: PrintJob) => void;
}

function getTypeBadgeStyle(type: PrintType) {
  switch (type) {
    case 'KOT':
      return {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        color: '#1D4ED8',
      };
    case 'BAR_RECEIPT':
      return {
        backgroundColor: '#FAF5FF',
        borderColor: '#E9D5FF',
        color: '#7E22CE',
      };
    case 'RECEIPT':
    default:
      return {
        backgroundColor: '#FFF7ED',
        borderColor: '#FED7AA',
        color: '#C2410C',
      };
  }
}

export function PrintJobCard({
  job,
  selected = false,
  actionBusy = false,
  onPress,
  onView,
  onRetry,
  onPrintAgain,
}: PrintJobCardProps) {
  const orderNo = orderLabel(job);
  const table = tableLabel(job);
  const employee = employeeLabel(job.requestedBy);
  const isFailed = job.status === 'FAILED';

  const isReprint = Boolean(
    job.parentPrintJobId ||
      job.metadata?.isReprint ||
      (job.attemptCount && job.attemptCount > 1),
  );

  const rawParty =
    job.metadata?.partyName ||
    job.metadata?.guestName ||
    (typeof job.orderId === 'object'
      ? (job.orderId as {partyName?: string; guestName?: string})?.partyName ||
        (job.orderId as {partyName?: string; guestName?: string})?.guestName
      : undefined);

  const guestCount =
    job.metadata?.guestCount ??
    (typeof job.orderId === 'object'
      ? (job.orderId as {guestCount?: number})?.guestCount
      : undefined);

  const partyLabel = rawParty ? String(rawParty).trim() : null;
  const guestLabel =
    guestCount != null
      ? `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}`
      : null;

  const typePalette = getTypeBadgeStyle(job.printType);

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
      {/* Top Header: Print Type, Reprint Badge, and Status */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: typePalette.backgroundColor,
                borderColor: typePalette.borderColor,
              },
            ]}>
            <Text style={[styles.typeBadgeText, {color: typePalette.color}]}>
              {printTypeLabel(job.printType)}
            </Text>
          </View>

          {isReprint && (
            <View style={styles.reprintBadge}>
              <Text style={styles.reprintBadgeText}>Reprint</Text>
            </View>
          )}
        </View>

        <PrintJobStatusBadge status={job.status} compact />
      </View>

      {/* Order Number & Table/Party Subtitle */}
      <View style={styles.orderRow}>
        <Text style={styles.orderNumber}>Order #{orderNo}</Text>
      </View>

      {(table || partyLabel || guestLabel) && (
        <Text style={styles.metaLine} numberOfLines={1}>
          {table && `${table}`}
          {table && partyLabel && ' · '}
          {partyLabel && `${partyLabel}`}
          {(table || partyLabel) && guestLabel && ' · '}
          {guestLabel && `${guestLabel}`}
        </Text>
      )}

      {/* Target Station, Created Time, Attempts */}
      <View style={styles.infoLine}>
        <Text style={styles.targetText}>
          {printerTargetLabel(job.printerTarget)}
        </Text>
        <Text style={styles.dotSeparator}>·</Text>
        <Text style={styles.timeText}>
          {formatPrintJobListTime(job.createdAt)}
        </Text>
        {job.printedAt ? (
          <>
            <Text style={styles.dotSeparator}>·</Text>
            <Text style={styles.printedTimeText}>
              Printed {formatPrintJobListTime(job.printedAt)}
            </Text>
          </>
        ) : null}
        {job.attemptCount && job.attemptCount > 0 ? (
          <>
            <Text style={styles.dotSeparator}>·</Text>
            <Text style={styles.attemptText}>
              {job.attemptCount} {job.attemptCount === 1 ? 'try' : 'tries'}
            </Text>
          </>
        ) : null}
      </View>

      {employee !== '—' && (
        <Text style={styles.employeeLine} numberOfLines={1}>
          Requested by {employee}
        </Text>
      )}

      {/* Error preview if Failed */}
      {isFailed && job.errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText} numberOfLines={2}>
            {job.errorMessage}
          </Text>
        </View>
      ) : null}

      {/* Card Quick Actions */}
      <View style={styles.quickActions}>
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
            <Eye size={13} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.viewButtonText}>View</Text>
          </Pressable>
        ) : null}

        {isFailed && onRetry ? (
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
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <RotateCcw size={13} color={colors.error} strokeWidth={2.4} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </>
            )}
          </Pressable>
        ) : null}

        {onPrintAgain ? (
          <Pressable
            style={({pressed}) => [
              styles.actionButton,
              styles.printAgainButton,
              pressed && styles.actionButtonPressed,
              actionBusy && styles.actionButtonDisabled,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              if (!actionBusy) {
                onPrintAgain(job);
              }
            }}
            disabled={actionBusy}
            accessibilityRole="button"
            accessibilityLabel="Print again">
            <Printer size={13} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.printAgainButtonText}>Print Again</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  cardSelected: {
    backgroundColor: colors.cream,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 11,
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
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  reprintBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  reprintBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  metaLine: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  targetText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  dotSeparator: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  printedTimeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  attemptText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  employeeLine: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  errorBox: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 15,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewButton: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  viewButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  retryButton: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  retryButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  printAgainButton: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  printAgainButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});
