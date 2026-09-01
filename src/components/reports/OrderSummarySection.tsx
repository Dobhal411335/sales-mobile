import React from 'react';
import {StyleSheet, Text} from 'react-native';
import type {EodOrderCounts} from '../../types/eod';
import {formatReportMoney, formatReportNumber} from '../../utils/eodFormat';
import {CollapsibleReportSection} from './CollapsibleReportSection';
import {ReportMetricCard} from './ReportMetricCard';
import {ReportMetricGrid} from './ReportMetricGrid';
import {colors} from '../../constants/colors';

interface OrderSummarySectionProps {
  orderCounts: EodOrderCounts;
}

export function OrderSummarySection({orderCounts}: OrderSummarySectionProps) {
  return (
    <CollapsibleReportSection title="Order Summary" defaultExpanded>
      <ReportMetricGrid>
        <ReportMetricCard label="Total Orders" value={formatReportNumber(orderCounts.total)} />
        <ReportMetricCard label="Paid / Completed" value={formatReportNumber(orderCounts.paid)} />
        <ReportMetricCard label="Pending / Open" value={formatReportNumber(orderCounts.open)} />
        <ReportMetricCard label="Cancelled" value={formatReportNumber(orderCounts.cancelled)} />
        <ReportMetricCard
          label="Cancelled Amount"
          value={formatReportMoney(orderCounts.cancelledAmount)}
        />
        <ReportMetricCard label="Waived" value={formatReportNumber(orderCounts.waived)} />
        <ReportMetricCard
          label="Waived Amount"
          value={formatReportMoney(orderCounts.waivedAmount)}
        />
        <ReportMetricCard label="Refunded" value={formatReportNumber(orderCounts.refunded)} />
      </ReportMetricGrid>
      {orderCounts.refundedNote ? (
        <Text style={styles.note}>{orderCounts.refundedNote}</Text>
      ) : null}
    </CollapsibleReportSection>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
