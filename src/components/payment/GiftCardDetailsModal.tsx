import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TabletModal} from '../common/TabletModal';
import {colors} from '../../constants/colors';
import type {GiftCardDetails} from '../../types/payment';
import {formatCurrency} from '../../utils/currency';

interface GiftCardDetailsModalProps {
  visible: boolean;
  details: GiftCardDetails | null;
  onClose: () => void;
  onApply: (details: GiftCardDetails) => void;
}

export function GiftCardDetailsModal({
  visible,
  details,
  onClose,
  onApply,
}: GiftCardDetailsModalProps) {
  if (!details) {
    return null;
  }

  const issueDateFormatted = details.issueDate
    ? new Date(details.issueDate).toLocaleDateString()
    : null;

  const validFromFormatted = details.validFrom
    ? new Date(details.validFrom).toLocaleDateString()
    : null;

  const validUntilFormatted = details.validUntil
    ? new Date(details.validUntil).toLocaleDateString()
    : null;

  const validityLabel =
    validFromFormatted || validUntilFormatted
      ? `${validFromFormatted || '—'} → ${validUntilFormatted || '—'}`
      : null;

  return (
    <TabletModal
      visible={visible}
      title="Gift Card Details"
      onClose={onClose}
      maxWidth={520}
      footerActions={[
        {
          label: 'Cancel',
          variant: 'secondary',
          onPress: onClose,
        },
        {
          label: 'Apply Gift Card',
          variant: 'primary',
          onPress: () => onApply(details),
        },
      ]}>
      <View style={styles.container}>
        {/* Card Overview Card */}
        <View style={styles.cardHeader}>
          <View style={styles.headerGrid}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>CODE</Text>
              <Text style={styles.codeText}>{details.code}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>BALANCE</Text>
              <Text style={styles.balanceText}>
                {formatCurrency(details.balance)}
              </Text>
            </View>

            {details.name ? (
              <View style={[styles.gridCol, styles.colFull]}>
                <Text style={styles.label}>CARD NAME</Text>
                <Text style={styles.valueText}>{details.name}</Text>
              </View>
            ) : null}

            {details.value != null ? (
              <View style={styles.gridCol}>
                <Text style={styles.label}>ORIGINAL VALUE</Text>
                <Text style={styles.valueText}>
                  {formatCurrency(details.value)}
                </Text>
              </View>
            ) : null}

            <View style={styles.gridCol}>
              <Text style={styles.label}>STATUS</Text>
              <Text style={styles.statusText}>
                {details.status || 'Active'}
                {details.isIssued ? ' · Issued' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Issued To Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ISSUED TO</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>
                {details.recipientName || '—'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>
                {details.recipientEmail || '—'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>
                {details.recipientPhone || '—'}
              </Text>
            </View>

            {issueDateFormatted ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Issued:</Text>
                <Text style={styles.detailValue}>{issueDateFormatted}</Text>
              </View>
            ) : null}

            {validityLabel ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Valid:</Text>
                <Text style={styles.detailValue}>{validityLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Usage History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>USAGE HISTORY</Text>
          {details.history && details.history.length > 0 ? (
            <View style={styles.historyTable}>
              <View style={styles.historyHeaderRow}>
                <Text style={[styles.historyHeaderCell, styles.cellDate]}>
                  Date
                </Text>
                <Text style={[styles.historyHeaderCell, styles.cellUsed]}>
                  Used
                </Text>
                <Text style={[styles.historyHeaderCell, styles.cellBalance]}>
                  Balance
                </Text>
                <Text style={[styles.historyHeaderCell, styles.cellOrder]}>
                  Order
                </Text>
              </View>

              {details.history.map((entry, idx) => (
                <View key={idx} style={styles.historyRow}>
                  <Text style={[styles.historyCell, styles.cellDate]}>
                    {new Date(entry.usedAt).toLocaleDateString()}
                  </Text>
                  <Text
                    style={[
                      styles.historyCell,
                      styles.cellUsed,
                      styles.usedText,
                    ]}>
                    -{formatCurrency(entry.amountUsed)}
                  </Text>
                  <Text
                    style={[
                      styles.historyCell,
                      styles.cellBalance,
                      styles.balanceCellText,
                    ]}>
                    {formatCurrency(entry.balanceAfter)}
                  </Text>
                  <Text
                    style={[styles.historyCell, styles.cellOrder]}
                    numberOfLines={1}>
                    {entry.orderNumber ? `#${entry.orderNumber}` : entry.note || '—'}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHistoryText}>
              No previous usage history.
            </Text>
          )}
        </View>
      </View>
    </TabletModal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 8,
  },
  cardHeader: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  headerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 16,
  },
  gridCol: {
    width: '46%',
  },
  colFull: {
    width: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'monospace',
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.success,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.serving,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  detailsGrid: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  historyTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  historyCell: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  cellDate: {
    flex: 1.1,
  },
  cellUsed: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 6,
  },
  cellBalance: {
    flex: 1,
    textAlign: 'right',
    paddingRight: 6,
  },
  cellOrder: {
    flex: 1,
    textAlign: 'right',
  },
  usedText: {
    color: colors.error,
    fontWeight: '700',
  },
  balanceCellText: {
    color: colors.text,
    fontWeight: '700',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});
