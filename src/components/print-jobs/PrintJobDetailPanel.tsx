import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {PrintJob, PrintJobDetailData, PrintJobStatus} from '../../types/printJob';
import {
  employeeLabel,
  formatPrintJobDetailTime,
  orderLabel,
  printTypeLabel,
  printerNameForTarget,
  printerTargetLabel,
} from '../../utils/printJobDisplay';
import {PrintJobStatusBadge} from './PrintJobStatusBadge';

interface PrintJobDetailPanelProps {
  job: PrintJob | null;
  detail: PrintJobDetailData | null;
  printers: Array<{target: PrintJob['printerTarget']; name: string}>;
  loading?: boolean;
  actionBusy?: boolean;
  actionMessage?: string | null;
  onView?: () => void;
  onRetry?: () => void;
  onMarkPrinted?: () => void;
  onPrintTest?: () => void;
}

function canShowRetry(status: PrintJobStatus): boolean {
  return status === 'FAILED' || status === 'QUEUED';
}

function canShowMarkPrinted(status: PrintJobStatus): boolean {
  return status !== 'PRINTED' && status !== 'CANCELLED';
}

function canShowPrintTest(status: PrintJobStatus): boolean {
  return status === 'QUEUED';
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = 'secondary',
  disabled,
  loading,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={({pressed}) => [
        styles.actionButton,
        variant === 'primary' && styles.actionPrimary,
        variant === 'success' && styles.actionSuccess,
        pressed && !disabled && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.surface : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.actionText,
            variant === 'primary' && styles.actionTextPrimary,
            variant === 'success' && styles.actionTextSuccess,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function PrintJobDetailPanel({
  job,
  detail,
  printers,
  loading = false,
  actionBusy = false,
  actionMessage,
  onView,
  onRetry,
  onMarkPrinted,
  onPrintTest,
}: PrintJobDetailPanelProps) {
  if (loading) {
    return (
      <View style={styles.emptyPanel}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptyText}>Loading print job…</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyTitle}>SELECTED JOB</Text>
        <Text style={styles.emptyText}>Select a print job to view details.</Text>
      </View>
    );
  }

  const printerName = printerNameForTarget(printers, job.printerTarget);
  const targetLabel = printerTargetLabel(job.printerTarget);

  return (
    <ScrollView
      style={styles.panel}
      contentContainerStyle={styles.panelContent}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.panelTitle}>PRINT JOB</Text>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status</Text>
        <PrintJobStatusBadge status={job.status} />
      </View>

      <DetailRow label="Type" value={printTypeLabel(job.printType)} />
      <DetailRow
        label="Target"
        value={printerName ? `${targetLabel} (${printerName})` : targetLabel}
      />
      <DetailRow label="Order" value={`#${orderLabel(job)}`} />
      <DetailRow
        label="Created"
        value={formatPrintJobDetailTime(job.createdAt)}
      />
      <DetailRow label="Attempts" value={String(job.attemptCount ?? 0)} />
      <DetailRow label="Employee" value={employeeLabel(job.requestedBy)} />

      {job.errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{job.errorMessage}</Text>
        </View>
      ) : null}

      {actionMessage ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{actionMessage}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {onView ? (
          <ActionButton
            label="View"
            onPress={onView}
            variant="primary"
            disabled={!detail}
          />
        ) : null}
        {canShowPrintTest(job.status) && onPrintTest ? (
          <ActionButton
            label="Print Test"
            onPress={onPrintTest}
            disabled={actionBusy}
            loading={actionBusy}
          />
        ) : null}
        {canShowRetry(job.status) && onRetry ? (
          <ActionButton
            label="Retry"
            onPress={onRetry}
            disabled={actionBusy}
            loading={actionBusy}
          />
        ) : null}
        {canShowMarkPrinted(job.status) && onMarkPrinted ? (
          <ActionButton
            label="Mark Printed"
            onPress={onMarkPrinted}
            variant="success"
            disabled={actionBusy}
            loading={actionBusy}
          />
        ) : null}
      </View>

      <Text style={styles.note}>
        Print Test uses MockPrinterAdapter. No physical printer is contacted.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  panelContent: {
    padding: 16,
    gap: 4,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1.2,
    textAlign: 'right',
  },
  errorBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
  },
  messageBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionSuccess: {
    borderColor: colors.success,
  },
  actionPressed: {
    opacity: 0.9,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  actionTextPrimary: {
    color: colors.surface,
  },
  actionTextSuccess: {
    color: colors.success,
  },
  note: {
    marginTop: 12,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  emptyPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
