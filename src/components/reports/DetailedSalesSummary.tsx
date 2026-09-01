import React from 'react';
import type {EodDetailedSalesSummary} from '../../types/eod';
import {formatReportMoney} from '../../utils/eodFormat';
import {CollapsibleReportSection} from './CollapsibleReportSection';
import {ReportMetricCard} from './ReportMetricCard';
import {ReportMetricGrid} from './ReportMetricGrid';

interface DetailedSalesSummaryProps {
  summary: EodDetailedSalesSummary;
}

export function DetailedSalesSummary({summary}: DetailedSalesSummaryProps) {
  return (
    <CollapsibleReportSection title="Detailed Sales Summary" defaultExpanded>
      <ReportMetricGrid>
        <ReportMetricCard label="Net Sales" value={formatReportMoney(summary.netSales)} />
        <ReportMetricCard label="Gross Sales" value={formatReportMoney(summary.grossSales)} />
        <ReportMetricCard
          label="Total Discounts"
          value={formatReportMoney(summary.totalDiscounts)}
        />
        <ReportMetricCard
          label="Menu Item Cost"
          value={formatReportMoney(summary.menuItemCost)}
        />
        <ReportMetricCard label="Labor Cost" value={formatReportMoney(summary.laborCost)} />
        <ReportMetricCard label="Gross Margin" value={formatReportMoney(summary.grossMargin)} />
        <ReportMetricCard
          label="Total Sales Taxes"
          value={formatReportMoney(summary.totalSalesTaxes)}
        />
        <ReportMetricCard
          label="Service Charges"
          value={formatReportMoney(summary.totalServiceCharges)}
        />
        <ReportMetricCard
          label="Avg Per Guest"
          value={formatReportMoney(summary.averagePerGuest)}
        />
        <ReportMetricCard
          label="Avg Per Bill"
          value={formatReportMoney(summary.averagePerBill)}
        />
        <ReportMetricCard
          label="Total Refund Amount"
          value={formatReportMoney(summary.totalRefundAmount)}
        />
      </ReportMetricGrid>
    </CollapsibleReportSection>
  );
}
