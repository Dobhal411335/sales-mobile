import React, {useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import {SalesMetricCard} from '../../../components/common/SalesMetricCard';
import {DetailedSalesSummary} from '../../../components/reports/DetailedSalesSummary';
import {EmailReportModal} from '../../../components/reports/EmailReportModal';
import {EodReportSections} from '../../../components/reports/EodReportSections';
import {OrderSummarySection} from '../../../components/reports/OrderSummarySection';
import {ReportActions} from '../../../components/reports/ReportActions';
import {ReportFeedbackBanner} from '../../../components/reports/ReportFeedbackBanner';
import {ReportHeader} from '../../../components/reports/ReportHeader';
import {SavedReportsHistory} from '../../../components/reports/SavedReportsHistory';
import {colors} from '../../../constants/colors';
import {useEodReport} from '../../../hooks/useEodReport';
import type {EodExportKind} from '../../../types/eod';
import {formatReportMoney, formatReportNumber} from '../../../utils/eodFormat';

export function EODReportScreen() {
  const {
    businessDate,
    setBusinessDate,
    report,
    saved,
    actualDeposit,
    setActualDeposit,
    defaultEmail,
    loading,
    saving,
    downloading,
    history,
    historyLoading,
    error,
    feedback,
    clearFeedback,
    refreshLive,
    saveReport,
    downloadExport,
    downloadExportForDate,
    sendEmail,
    loadHistory,
    viewHistoryDate,
    apiConfigured,
  } = useEodReport();

  const [emailOpen, setEmailOpen] = useState(false);

  const summary = report?.summary;
  const recon = report?.reconciliation;

  const handleHistoryExport = (date: string, kind: EodExportKind) => {
    downloadExportForDate(date, kind);
  };

  return (
    <View style={styles.screen}>
      <ReportHeader saved={saved} />

      <ReportActions
        businessDate={businessDate}
        actualDeposit={actualDeposit}
        loading={loading}
        saving={saving}
        downloading={downloading}
        hasReport={!!report}
        onDateChange={setBusinessDate}
        onDepositChange={setActualDeposit}
        onRefreshLive={refreshLive}
        onSave={saveReport}
        onExport={downloadExport}
        onEmail={() => setEmailOpen(true)}
      />

      <ReportFeedbackBanner feedback={feedback} onDismiss={clearFeedback} />

      {recon && !recon.ok ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningTitle}>
            Report totals require attention before relying on them.
          </Text>
          {(recon.messages ?? []).map((message, index) => (
            <Text key={`${message}-${index}`} style={styles.warningMessage}>
              {message}
            </Text>
          ))}
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={refreshLive}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : report ? (
          <>
            <View style={styles.kpiGrid}>
              <SalesMetricCard label="Net Sales" value={formatReportMoney(summary?.netSales)} />
              <SalesMetricCard label="Orders" value={formatReportNumber(summary?.orders)} />
              <SalesMetricCard label="Taxes" value={formatReportMoney(summary?.taxes)} />
              <SalesMetricCard label="Tips" value={formatReportMoney(summary?.tips)} />
              <SalesMetricCard
                label="Service Charges"
                value={formatReportMoney(summary?.serviceCharges)}
              />
              <SalesMetricCard label="Cash" value={formatReportMoney(summary?.cash)} />
              <SalesMetricCard label="Card" value={formatReportMoney(summary?.card)} />
              <SalesMetricCard label="Gift Card" value={formatReportMoney(summary?.giftCard)} />
            </View>

            <View style={styles.reportCard}>
              <Text style={styles.reportTitle}>
                {report.meta?.title ?? 'Full Report'}
              </Text>

              <OrderSummarySection orderCounts={report.orderCounts} />
              <DetailedSalesSummary summary={report.detailedSalesSummary} />
              <EodReportSections report={report} />
            </View>

            <SavedReportsHistory
              history={history}
              loading={historyLoading}
              onRefresh={loadHistory}
              onView={viewHistoryDate}
              onExport={handleHistoryExport}
            />
          </>
        ) : (
          <View style={styles.centerState}>
            <Text style={styles.emptyText}>No sales data for this business day.</Text>
          </View>
        )}
      </ScrollView>

      <EmailReportModal
        visible={emailOpen}
        businessDate={businessDate}
        defaultEmail={defaultEmail}
        apiConfigured={apiConfigured}
        onClose={() => setEmailOpen(false)}
        onSend={sendEmail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  warningBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
    padding: 12,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  warningMessage: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reportCard: {
    gap: 0,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
});
