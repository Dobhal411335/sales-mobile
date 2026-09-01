import React from 'react';
import {StyleSheet, Text} from 'react-native';
import type {EodReport} from '../../types/eod';
import {formatReportMoney, formatReportNumber} from '../../utils/eodFormat';
import {CollapsibleReportSection} from './CollapsibleReportSection';
import {ReportDataTable} from './ReportDataTable';
import {ReportMetricCard} from './ReportMetricCard';
import {ReportMetricGrid} from './ReportMetricGrid';
import {colors} from '../../constants/colors';

interface EodReportSectionsProps {
  report: EodReport;
}

export function EodReportSections({report}: EodReportSectionsProps) {
  const dls = report.detailedLaborSummary;
  const ps = report.paymentsSummary;
  const ts = report.tipsSummary;
  const st = report.salesTaxAndTipSummary;
  const cd = report.cashDeposit;

  return (
    <>
      <CollapsibleReportSection title="Detailed Labor Summary">
        <ReportMetricGrid>
          <ReportMetricCard label="Total Labor Cost" value={formatReportMoney(dls.totalLaborCost)} />
          <ReportMetricCard label="Total Labor Hours" value={formatReportMoney(dls.totalLaborHours)} />
          <ReportMetricCard
            label="Labor Cost % Net"
            value={`${Number(dls.laborCostPctOfNetSales || 0).toFixed(2)}%`}
          />
          <ReportMetricCard
            label="Avg Table Turn (min)"
            value={formatReportMoney(dls.averageTableTurnTimeMinutes)}
          />
          <ReportMetricCard label="Non-Cash Tips" value={formatReportMoney(dls.totalNonCashTips)} />
          <ReportMetricCard label="Cash Tips" value={formatReportMoney(dls.totalCashTips)} />
          <ReportMetricCard label="Total Tips" value={formatReportMoney(dls.totalTips)} />
          <ReportMetricCard label="Total Gratuity" value={formatReportMoney(dls.totalGratuity)} />
          <ReportMetricCard label="Active Shifts" value={formatReportNumber(dls.totalActiveShifts)} />
          <ReportMetricCard
            label="Completed Shifts"
            value={formatReportNumber(dls.totalCompletedShifts)}
          />
        </ReportMetricGrid>
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Payments Summary">
        <ReportMetricGrid>
          <ReportMetricCard label="Transactions" value={formatReportNumber(ps.transactionsCount)} />
          <ReportMetricCard label="Refunds Count" value={formatReportNumber(ps.refundsCount)} />
          <ReportMetricCard label="Total Cash" value={formatReportMoney(ps.totalCash)} />
          <ReportMetricCard label="Total Non-Cash" value={formatReportMoney(ps.totalNonCash)} />
          <ReportMetricCard label="Total Surcharges" value={formatReportMoney(ps.totalSurcharges)} />
          <ReportMetricCard label="Total Payment" value={formatReportMoney(ps.totalPayment)} />
          <ReportMetricCard
            label="Payments − Net Sales"
            value={formatReportMoney(ps.totalPaymentsMinusNetSales)}
          />
          <ReportMetricCard label="Cash Rounding" value={formatReportMoney(ps.totalCashRounding)} />
        </ReportMetricGrid>
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Sales By Section">
        <ReportDataTable
          headers={['Section Name', 'Bill Count', 'Net Sales', 'Gross Sales', 'Discounts', 'Taxes']}
          rows={[
            ...report.salesBySection.rows.map((r) => [
              r.sectionName,
              r.billCount,
              formatReportMoney(r.netSales),
              formatReportMoney(r.grossSales),
              formatReportMoney(r.discounts),
              formatReportMoney(r.taxes),
            ]),
            [
              'TOTAL',
              report.salesBySection.total.billCount,
              formatReportMoney(report.salesBySection.total.netSales),
              formatReportMoney(report.salesBySection.total.grossSales),
              formatReportMoney(report.salesBySection.total.discounts),
              formatReportMoney(report.salesBySection.total.taxes),
            ],
          ]}
        />
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Sales By Sales Category">
        <ReportDataTable
          headers={['Sales Category', 'Qty', 'Net Sales', 'Gross Sales', 'Discounts', 'Taxes']}
          rows={[
            ...report.salesBySalesCategory.rows.map((r) => [
              r.salesCategory,
              r.menuItemQuantity,
              formatReportMoney(r.netSales),
              formatReportMoney(r.grossSales),
              formatReportMoney(r.discounts),
              formatReportMoney(r.taxes),
            ]),
            [
              'TOTAL',
              report.salesBySalesCategory.total.menuItemQuantity,
              formatReportMoney(report.salesBySalesCategory.total.netSales),
              formatReportMoney(report.salesBySalesCategory.total.grossSales),
              formatReportMoney(report.salesBySalesCategory.total.discounts),
              formatReportMoney(report.salesBySalesCategory.total.taxes),
            ],
          ]}
        />
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Gift Cards">
        <ReportDataTable
          headers={['Item', 'Count', 'Total']}
          rows={report.giftCardSales.rows.map((r) => [
            r.item,
            r.count,
            formatReportMoney(r.total),
          ])}
        />
        {report.giftCardSales.note ? (
          <Text style={styles.note}>{report.giftCardSales.note}</Text>
        ) : null}
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Tips By Employees">
        <ReportDataTable
          headers={['Employee Name', 'Cash Tips', 'Non-Cash Tips', 'Total Tips']}
          rows={[
            ...report.tipsByEmployees.rows.map((r) => [
              r.employeeName,
              formatReportMoney(r.cashTips),
              formatReportMoney(r.nonCashTips),
              formatReportMoney(r.totalTips),
            ]),
            [
              'TOTAL',
              formatReportMoney(report.tipsByEmployees.total.cashTips),
              formatReportMoney(report.tipsByEmployees.total.nonCashTips),
              formatReportMoney(report.tipsByEmployees.total.totalTips),
            ],
          ]}
        />
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Tips Summary">
        <ReportMetricGrid>
          <ReportMetricCard label="Cash Tips" value={formatReportMoney(ts.totalCashTips)} />
          <ReportMetricCard label="Non-Cash Tips" value={formatReportMoney(ts.totalNonCashTips)} />
          <ReportMetricCard label="Total Tips" value={formatReportMoney(ts.totalTips)} />
        </ReportMetricGrid>
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Payment By Payment Type">
        <ReportDataTable
          headers={['Payment Type', 'Count', 'Refunds', 'Tips', 'Payment Total']}
          rows={[
            ...report.paymentByPaymentType.rows.map((r) => [
              r.paymentType,
              r.paymentCount,
              formatReportMoney(r.refunds),
              formatReportMoney(r.tips),
              formatReportMoney(r.paymentTotal),
            ]),
            [
              'TOTAL',
              report.paymentByPaymentType.total.paymentCount,
              formatReportMoney(report.paymentByPaymentType.total.refunds),
              formatReportMoney(report.paymentByPaymentType.total.tips),
              formatReportMoney(report.paymentByPaymentType.total.paymentTotal),
            ],
          ]}
        />
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Accounts">
        <ReportDataTable
          headers={['Account Name', 'Payments', 'Deposits']}
          rows={report.accounts.rows.map((r) => [
            r.accountName,
            formatReportMoney(r.payments),
            formatReportMoney(r.deposits),
          ])}
        />
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Tip Outs">
        <ReportMetricGrid>
          <ReportMetricCard
            label="Cash Owed To House"
            value={formatReportMoney(report.tipOuts.totalCashOwedToHouse)}
          />
          <ReportMetricCard
            label="Cash Owed To Server"
            value={formatReportMoney(report.tipOuts.totalCashOwedToServer)}
          />
        </ReportMetricGrid>
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Payouts / Payins">
        <ReportMetricGrid>
          <ReportMetricCard
            label="Total Payouts"
            value={formatReportMoney(report.payouts.totalPayouts)}
          />
          <ReportMetricCard
            label="Total Payins"
            value={formatReportMoney(report.payins.totalPayins)}
          />
        </ReportMetricGrid>
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Sales Tax And Tip Summary">
        <ReportMetricGrid>
          <ReportMetricCard label="Net Sales" value={formatReportMoney(st.netSales)} />
          <ReportMetricCard label="Gross Sales" value={formatReportMoney(st.grossSales)} />
          <ReportMetricCard label="Discounts" value={formatReportMoney(st.totalDiscounts)} />
          <ReportMetricCard label="Taxes" value={formatReportMoney(st.totalSalesTaxes)} />
          <ReportMetricCard label="Tips" value={formatReportMoney(st.totalTips)} />
          <ReportMetricCard
            label="Net + Tax + Tips + SC"
            value={formatReportMoney(st.totalNetSalesTaxesAndTips)}
          />
          <ReportMetricCard
            label="Service Charges"
            value={formatReportMoney(st.serviceCharges)}
          />
          <ReportMetricCard label="Refunds" value={formatReportMoney(st.totalRefundsAmount)} />
          <ReportMetricCard label="Voids" value={formatReportMoney(st.totalVoids)} />
          <ReportMetricCard label="Bill Count" value={formatReportNumber(st.totalBillCount)} />
          <ReportMetricCard label="Guest Count" value={formatReportNumber(st.totalGuestCount)} />
          <ReportMetricCard label="Gift Card Sales" value={formatReportMoney(st.giftCardSales)} />
          <ReportMetricCard label="Gross Margin" value={formatReportMoney(st.grossMargin)} />
        </ReportMetricGrid>
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Cash Deposit">
        <ReportMetricGrid>
          <ReportMetricCard label="Business Day" value={cd.businessDay || '—'} />
          <ReportMetricCard label="Expected Cash" value={formatReportMoney(cd.expectedDeposit)} />
          <ReportMetricCard label="Actual Deposit" value={formatReportMoney(cd.actualDeposit)} />
          <ReportMetricCard label="Over / Short" value={formatReportMoney(cd.overShort)} />
          <ReportMetricCard label="Created By" value={cd.createdBy || '—'} />
        </ReportMetricGrid>
        {cd.note ? <Text style={styles.note}>{cd.note}</Text> : null}
      </CollapsibleReportSection>

      <CollapsibleReportSection title="Tax Summary">
        <ReportDataTable
          headers={['Tax Name', 'Bill Count', 'Tax Amount', 'Net Sales']}
          rows={[
            ...report.taxSummary.rows.map((r) => [
              r.taxName,
              r.billCount,
              formatReportMoney(r.taxAmount),
              r.netSales === '' ? '' : formatReportMoney(Number(r.netSales)),
            ]),
            [
              'TOTAL',
              report.taxSummary.total.billCount,
              formatReportMoney(report.taxSummary.total.taxAmount),
              report.taxSummary.total.netSales,
            ],
          ]}
        />
      </CollapsibleReportSection>
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
