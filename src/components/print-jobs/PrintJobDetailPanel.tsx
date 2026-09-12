import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import {
  ExternalLink,
  Info,
  Printer,
  RotateCcw,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {
  PrintJob,
  PrintJobDetailData,
  PrintJobStatus,
} from '../../types/printJob';
import {formatCurrency} from '../../utils/currency';
import {
  employeeLabel,
  formatPrintJobDetailTime,
  getTicketItems,
  orderLabel,
  printTypeLabel,
  printerNameForTarget,
  printerTargetLabel,
  tableLabel,
} from '../../utils/printJobDisplay';
import {PrintJobStatusBadge} from './PrintJobStatusBadge';

interface PrintJobDetailPanelProps {
  job: PrintJob | null;
  detail: PrintJobDetailData | null;
  printers: Array<{target: PrintJob['printerTarget']; name: string}>;
  loading?: boolean;
  actionBusy?: boolean;
  reprinting?: boolean;
  actionMessage?: string | null;
  onView?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onPrintAgain?: () => void;
  onSelectOriginalJob?: (jobId: string) => void;
}

function canShowRetry(status: PrintJobStatus): boolean {
  return status === 'FAILED';
}

function canShowCancel(status: PrintJobStatus): boolean {
  return status === 'QUEUED';
}

function DetailRow({
  label,
  value,
  isMono = false,
}: {
  label: string;
  value: string;
  isMono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, isMono && styles.monoValue]}
        numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function PrintJobDetailPanel({
  job,
  detail,
  printers,
  loading = false,
  actionBusy = false,
  reprinting = false,
  actionMessage,
  onView,
  onRetry,
  onCancel,
  onPrintAgain,
  onSelectOriginalJob,
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
  const order = detail?.order ?? null;
  const ticketItems = detail ? getTicketItems(detail) : [];

  const isReprint = Boolean(
    job.parentPrintJobId ||
      job.metadata?.isReprint ||
      (job.attemptCount && job.attemptCount > 1),
  );

  const parentJobId = job.parentPrintJobId
    ? typeof job.parentPrintJobId === 'object'
      ? (job.parentPrintJobId as {_id?: string})._id ||
        String(job.parentPrintJobId)
      : String(job.parentPrintJobId)
    : null;

  const tableStr = tableLabel(job);

  return (
    <ScrollView
      style={styles.panel}
      contentContainerStyle={styles.panelContent}
      keyboardShouldPersistTaps="handled">
      {/* Header with Title & Badges */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.panelTitle}>PRINT JOB</Text>
          <Text style={styles.jobIdSubtitle}>#{String(job._id).slice(-6)}</Text>
        </View>

        <View style={styles.headerBadges}>
          {isReprint && (
            <View style={styles.reprintBadge}>
              <Text style={styles.reprintBadgeText}>Reprint</Text>
            </View>
          )}
          <PrintJobStatusBadge status={job.status} />
        </View>
      </View>

      {/* Parent Reprint Banner */}
      {parentJobId && (
        <View style={styles.parentNotice}>
          <View style={styles.parentNoticeLeft}>
            <Info size={16} color="#C2410C" strokeWidth={2.4} />
            <Text style={styles.parentNoticeText}>
              Reprint of job{' '}
              <Text style={styles.parentNoticeMono}>
                #{parentJobId.slice(-6)}
              </Text>
            </Text>
          </View>
          {onSelectOriginalJob && (
            <Pressable
              style={styles.viewOriginalBtn}
              onPress={() => onSelectOriginalJob(parentJobId)}
              accessibilityRole="button"
              accessibilityLabel="View original print job">
              <Text style={styles.viewOriginalText}>View Original</Text>
              <ExternalLink size={12} color="#C2410C" strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      )}

      {/* Job Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>JOB INFORMATION</Text>

        <DetailRow label="Order Number" value={`#${orderLabel(job)}`} />
        <DetailRow label="Print Type" value={printTypeLabel(job.printType)} />
        <DetailRow
          label="Target Station"
          value={printerName ? `${targetLabel} (${printerName})` : targetLabel}
        />
        {tableStr && <DetailRow label="Table" value={tableStr} />}
        <DetailRow
          label="Created At"
          value={formatPrintJobDetailTime(job.createdAt)}
        />
        {job.startedAt ? (
          <DetailRow
            label="Started At"
            value={formatPrintJobDetailTime(job.startedAt)}
          />
        ) : null}
        {job.printedAt ? (
          <DetailRow
            label="Printed At"
            value={formatPrintJobDetailTime(job.printedAt)}
          />
        ) : null}
        <DetailRow
          label="Print Attempts"
          value={String(job.attemptCount ?? 0)}
          isMono
        />
        <DetailRow
          label="Requested By"
          value={employeeLabel(job.requestedBy) || detail?.serverName || '—'}
        />

        {job.errorMessage ? (
          <View style={styles.errorBox}>
            <View style={styles.errorHeader}>
              <TriangleAlert size={14} color="#991B1B" strokeWidth={2.4} />
              <Text style={styles.errorTitle}>Print Error:</Text>
            </View>
            <Text style={styles.errorText}>{job.errorMessage}</Text>
          </View>
        ) : null}

        {actionMessage ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{actionMessage}</Text>
          </View>
        ) : null}

        {/* Primary Action Buttons inside Card */}
        <View style={styles.primaryActions}>
          {onPrintAgain && (
            <Pressable
              style={({pressed}) => [
                styles.btnBase,
                styles.btnPrimary,
                pressed && !reprinting && styles.btnPressed,
                reprinting && styles.btnDisabled,
              ]}
              onPress={onPrintAgain}
              disabled={reprinting || actionBusy}
              accessibilityRole="button"
              accessibilityLabel="Print ticket again">
              {reprinting ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color={colors.surface} />
                  <Text style={styles.btnPrimaryText}>Queueing...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Printer size={15} color={colors.surface} strokeWidth={2.4} />
                  <Text style={styles.btnPrimaryText}>Print Again</Text>
                </View>
              )}
            </Pressable>
          )}

          {canShowRetry(job.status) && onRetry && (
            <Pressable
              style={({pressed}) => [
                styles.btnBase,
                styles.btnRetry,
                pressed && !actionBusy && styles.btnPressed,
                actionBusy && styles.btnDisabled,
              ]}
              onPress={onRetry}
              disabled={actionBusy || reprinting}
              accessibilityRole="button"
              accessibilityLabel="Retry print job">
              {actionBusy ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <View style={styles.btnRow}>
                  <RotateCcw size={15} color={colors.error} strokeWidth={2.4} />
                  <Text style={styles.btnRetryText}>Retry</Text>
                </View>
              )}
            </Pressable>
          )}

          {canShowCancel(job.status) && onCancel && (
            <Pressable
              style={({pressed}) => [
                styles.btnBase,
                styles.btnCancel,
                pressed && !actionBusy && styles.btnPressed,
                actionBusy && styles.btnDisabled,
              ]}
              onPress={onCancel}
              disabled={actionBusy || reprinting}
              accessibilityRole="button"
              accessibilityLabel="Cancel queued print job">
              {actionBusy ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <View style={styles.btnRow}>
                  <X size={15} color={colors.textSecondary} strokeWidth={2.4} />
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {onView && (
          <Pressable
            style={({pressed}) => [
              styles.secondaryBtn,
              pressed && styles.btnPressed,
              !detail && styles.btnDisabled,
            ]}
            onPress={onView}
            disabled={!detail}
            accessibilityRole="button"
            accessibilityLabel="View Receipt Preview">
            <Text style={styles.secondaryBtnText}>View Receipt</Text>
          </Pressable>
        )}
      </View>

      {/* Related Order Summary Card */}
      {order && (
        <View style={styles.card}>
          <View style={styles.orderSummaryHeader}>
            <Text style={styles.cardHeader}>
              ORDER SUMMARY (#{order.orderNumber})
            </Text>
            {order.paymentStatus ? (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{order.paymentStatus}</Text>
              </View>
            ) : null}
          </View>

          {/* Line items list */}
          <View style={styles.itemsList}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, idx) => (
                <View key={`item-${idx}`} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>
                      {item.qty}x {item.name}
                    </Text>
                    {item.size && item.size !== 'Standard' && (
                      <Text style={styles.itemSub}>({item.size})</Text>
                    )}
                    {item.preparationStyle ? (
                      <Text style={styles.itemSub}>
                        Style: {item.preparationStyle}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemPrice}>
                    {formatCurrency((item.price || 0) * (item.qty || 1))}
                  </Text>
                </View>
              ))
            ) : ticketItems.length > 0 ? (
              ticketItems.map((item, idx) => (
                <View key={`titem-${idx}`} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.qty || 1}x {item.name}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noItemsText}>No items stored for this ticket.</Text>
            )}
          </View>

          {/* Financial Breakdown */}
          {order.totalAmount != null && (
            <View style={styles.financialSection}>
              <View style={styles.finRow}>
                <Text style={styles.finLabel}>Subtotal</Text>
                <Text style={styles.finValue}>
                  {formatCurrency(order.subTotal || 0)}
                </Text>
              </View>

              {order.discountTotal && order.discountTotal > 0 ? (
                <>
                  <View style={styles.finRow}>
                    <Text style={[styles.finLabel, styles.discountText]}>
                      Discount
                    </Text>
                    <Text style={[styles.finValue, styles.discountText]}>
                      -{formatCurrency(order.discountTotal)}
                    </Text>
                  </View>
                  <View style={styles.finRow}>
                    <Text style={styles.finLabel}>Net Subtotal</Text>
                    <Text style={styles.finValue}>
                      {formatCurrency(
                        Math.max(
                          0,
                          (order.subTotal || 0) - order.discountTotal,
                        ),
                      )}
                    </Text>
                  </View>
                </>
              ) : null}

              {order.taxTotal && order.taxTotal > 0 ? (
                <View style={styles.finRow}>
                  <Text style={styles.finLabel}>HST / Tax</Text>
                  <Text style={styles.finValue}>
                    {formatCurrency(order.taxTotal)}
                  </Text>
                </View>
              ) : null}

              {order.serviceChargeTotal && order.serviceChargeTotal > 0 ? (
                <View style={styles.finRow}>
                  <Text style={styles.finLabel}>
                    {order.serviceChargeName || 'Service Charge'}
                  </Text>
                  <Text style={styles.finValue}>
                    {formatCurrency(order.serviceChargeTotal)}
                  </Text>
                </View>
              ) : null}

              {order.tipAmount && order.tipAmount > 0 ? (
                <View style={styles.finRow}>
                  <Text style={styles.finLabel}>Tip</Text>
                  <Text style={styles.finValue}>
                    {formatCurrency(order.tipAmount)}
                  </Text>
                </View>
              ) : null}

              <View style={[styles.finRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(
                    (order.totalAmount || 0) + (order.tipAmount || 0),
                  )}
                </Text>
              </View>

              {order.paymentMethod && (
                <View style={styles.finRow}>
                  <Text style={styles.finSubLabel}>Payment Method</Text>
                  <Text style={styles.finSubValue}>{order.paymentMethod}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
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
    gap: 12,
  },
  emptyPanel: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  jobIdSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.text,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reprintBadge: {
    paddingHorizontal: 7,
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
  parentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    gap: 8,
  },
  parentNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  parentNoticeText: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '500',
  },
  parentNoticeMono: {
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  viewOriginalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  viewOriginalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  rowLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  monoValue: {
    fontFamily: 'monospace',
  },
  errorBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  errorText: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
  },
  messageBox: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 11,
    color: colors.text,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  btnBase: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface,
  },
  btnRetry: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnRetryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  btnCancel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnSuccess: {
    borderColor: colors.success,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  secondaryBtnTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  itemSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.text,
    marginLeft: 8,
  },
  noItemsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  financialSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 4,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  finValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  discountText: {
    color: colors.success,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  finSubLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  finSubValue: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
