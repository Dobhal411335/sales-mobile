import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ReceiptPreview} from '../../../components/payment/ReceiptPreview';
import {TabletModal} from '../../../components/common/TabletModal';
import {PrintJobCard} from '../../../components/print-jobs/PrintJobCard';
import {PrintJobDetailPanel} from '../../../components/print-jobs/PrintJobDetailPanel';
import {PrintJobFilters} from '../../../components/print-jobs/PrintJobFilters';
import {PrintJobStatusBadge} from '../../../components/print-jobs/PrintJobStatusBadge';
import {colors} from '../../../constants/colors';
import type {SalesStackParamList} from '../../../navigation/types';
import {usePrintJobStore} from '../../../store/printJobStore';
import type {PrintJob, PrintJobFilter} from '../../../types/printJob';
import {filterDisplayLabel} from '../../../types/printJob';
import {
  buildReceiptOrderFromDetail,
  formatPrintJobDetailTime,
  getTicketItems,
  orderLabel,
  printTypeLabel,
  printTypeToReceiptMode,
  printerTargetLabel,
} from '../../../utils/printJobDisplay';

type Props = NativeStackScreenProps<SalesStackParamList, 'PrintJobs'>;

const MASTER_DETAIL_BREAKPOINT = 720;

function EmptyState({filter}: {filter: PrintJobFilter}) {
  const message =
    filter === 'ALL'
      ? 'No print jobs found.'
      : `No ${filterDisplayLabel(filter).toLowerCase()} print jobs.`;
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

export function PrintJobsScreen({navigation, route}: Props) {
  const {width} = useWindowDimensions();
  const isMasterDetail = width >= MASTER_DETAIL_BREAKPOINT;
  const contentWidth = isMasterDetail ? width * 0.95 : Math.min(width * 0.95, 900);

  const jobs = usePrintJobStore((s) => s.jobs);
  const selectedJobId = usePrintJobStore((s) => s.selectedJobId);
  const filter = usePrintJobStore((s) => s.filter);
  const printers = usePrintJobStore((s) => s.printers);
  const detail = usePrintJobStore((s) => s.detail);
  const loading = usePrintJobStore((s) => s.loading);
  const refreshing = usePrintJobStore((s) => s.refreshing);
  const detailLoading = usePrintJobStore((s) => s.detailLoading);
  const actionBusy = usePrintJobStore((s) => s.actionBusy);
  const error = usePrintJobStore((s) => s.error);
  const actionMessage = usePrintJobStore((s) => s.actionMessage);
  const fetchList = usePrintJobStore((s) => s.fetchList);
  const fetchPrintersList = usePrintJobStore((s) => s.fetchPrintersList);
  const setFilter = usePrintJobStore((s) => s.setFilter);
  const selectJob = usePrintJobStore((s) => s.selectJob);
  const retry = usePrintJobStore((s) => s.retry);
  const markPrinted = usePrintJobStore((s) => s.markPrinted);
  const runPrintTest = usePrintJobStore((s) => s.runPrintTest);
  const clearActionMessage = usePrintJobStore((s) => s.clearActionMessage);

  const [previewOpen, setPreviewOpen] = useState(false);
  const deepLinkJobId = route.params?.jobId;

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedJobId) ?? detail?.job ?? null,
    [jobs, selectedJobId, detail?.job],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchList({silent: jobs.length > 0});
      void fetchPrintersList();
    }, [fetchList, fetchPrintersList, jobs.length]),
  );

  useEffect(() => {
    if (deepLinkJobId) {
      void selectJob(deepLinkJobId);
    }
  }, [deepLinkJobId, selectJob]);

  const onFilterChange = useCallback(
    (next: PrintJobFilter) => {
      clearActionMessage();
      void setFilter(next);
    },
    [setFilter, clearActionMessage],
  );

  const onRefresh = useCallback(() => {
    clearActionMessage();
    void fetchList({silent: true});
  }, [fetchList, clearActionMessage]);

  const handleSelectJob = useCallback(
    (job: PrintJob) => {
      clearActionMessage();
      void selectJob(job._id);
    },
    [selectJob, clearActionMessage],
  );

  const handleOpenPreview = useCallback(() => {
    if (detail) {
      setPreviewOpen(true);
    }
  }, [detail]);

  const handleRetry = useCallback(
    (id: string) => {
      void retry(id);
    },
    [retry],
  );

  const handleMarkPrinted = useCallback(
    (id: string) => {
      void markPrinted(id);
    },
    [markPrinted],
  );

  const handlePrintTest = useCallback(
    (id: string) => {
      void runPrintTest(id);
    },
    [runPrintTest],
  );

  const renderItem = useCallback(
    ({item}: {item: PrintJob}) => (
      <PrintJobCard
        job={item}
        selected={item._id === selectedJobId}
        actionBusy={actionBusy && item._id === selectedJobId}
        onPress={handleSelectJob}
        onView={() => {
          void selectJob(item._id).then(() => setPreviewOpen(true));
        }}
        onRetry={(job) => handleRetry(job._id)}
      />
    ),
    [selectedJobId, actionBusy, handleSelectJob, selectJob, handleRetry],
  );

  const previewContent = useMemo(() => {
    if (!detail) {
      return null;
    }
    const receiptOrder = buildReceiptOrderFromDetail(detail);
    const ticketItems = getTicketItems(detail);
    const mode = printTypeToReceiptMode(detail.job.printType);
    return {
      mode,
      order: receiptOrder,
      kotItems: ticketItems,
      serverName: detail.serverName ?? detail.job.metadata?.serverName,
      guestCount: detail.guestCount ?? detail.job.metadata?.guestCount,
      specialNote: detail.job.metadata?.specialNote,
      restaurantName:
        detail.restaurant?.name ?? detail.job.metadata?.restaurantName,
    };
  }, [detail]);

  const listSection = (
    <View style={[styles.listSection, isMasterDetail && styles.listSectionSplit]}>
      <Text style={styles.sectionLabel}>PRINT JOBS</Text>
      {loading && jobs.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.listCard}>
          <FlatList
            data={jobs}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={!loading ? <EmptyState filter={filter} /> : undefined}
          />
        </View>
      )}
    </View>
  );

  const detailSection = (
    <View
      style={[
        styles.detailSection,
        isMasterDetail && styles.detailSectionSplit,
        !isMasterDetail && selectedJob && styles.detailSectionStacked,
      ]}>
      <PrintJobDetailPanel
        job={selectedJob}
        detail={detail}
        printers={printers}
        loading={detailLoading && Boolean(selectedJobId)}
        actionBusy={actionBusy}
        actionMessage={actionMessage}
        onView={detail ? handleOpenPreview : undefined}
        onRetry={
          selectedJob
            ? () => handleRetry(selectedJob._id)
            : undefined
        }
        onMarkPrinted={
          selectedJob
            ? () => handleMarkPrinted(selectedJob._id)
            : undefined
        }
        onPrintTest={
          selectedJob
            ? () => handlePrintTest(selectedJob._id)
            : undefined
        }
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.content, {width: contentWidth}, styles.contentFull]}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Pressable
              style={({pressed}) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>

            <View>
              <Text style={styles.pageTitle}>Print Jobs</Text>
              <Text style={styles.subtitle}>
                Receipt & kitchen ticket queue
              </Text>
            </View>
          </View>

          <Pressable
            style={({pressed}) => [
              styles.refreshButton,
              pressed && styles.refreshButtonPressed,
              refreshing && styles.refreshButtonDisabled,
            ]}
            onPress={onRefresh}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh print jobs">
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Text>
          </Pressable>
        </View>

        <PrintJobFilters activeFilter={filter} onFilterChange={onFilterChange} />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Unable to load print jobs.</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => void fetchList({silent: false})}
              accessibilityRole="button"
              accessibilityLabel="Retry">
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.body,
            isMasterDetail ? styles.bodyLandscape : styles.bodyPortrait,
          ]}>
          {listSection}
          {isMasterDetail || selectedJob ? detailSection : null}
        </View>
      </View>

      <TabletModal
        visible={previewOpen}
        title="Print Job"
        onClose={() => setPreviewOpen(false)}
        maxWidth={920}
        splitContent={
          previewContent && detail
            ? {
                left: (
                  <ReceiptPreview
                    mode={previewContent.mode}
                    order={previewContent.order}
                    kotItems={previewContent.kotItems}
                    serverName={previewContent.serverName}
                    guestCount={previewContent.guestCount}
                    specialNote={previewContent.specialNote}
                    restaurantName={previewContent.restaurantName}
                  />
                ),
                right: (
                  <View style={styles.previewPanel}>
                    <Text style={styles.previewTitle}>PRINT JOB</Text>
                    <View style={styles.previewStatusRow}>
                      <Text style={styles.previewLabel}>Status</Text>
                      <PrintJobStatusBadge status={detail.job.status} />
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Type</Text>
                      <Text style={styles.previewValue}>
                        {printTypeLabel(detail.job.printType)}
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Target</Text>
                      <Text style={styles.previewValue}>
                        {printerTargetLabel(detail.job.printerTarget)}
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Order</Text>
                      <Text style={styles.previewValue}>
                        #{orderLabel(detail.job)}
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Created</Text>
                      <Text style={styles.previewValue}>
                        {formatPrintJobDetailTime(detail.job.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Attempts</Text>
                      <Text style={styles.previewValue}>
                        {detail.job.attemptCount ?? 0}
                      </Text>
                    </View>

                    {detail.job.errorMessage ? (
                      <View style={styles.previewErrorBox}>
                        <Text style={styles.previewErrorText}>
                          {detail.job.errorMessage}
                        </Text>
                      </View>
                    ) : null}

                    {actionMessage ? (
                      <View style={styles.previewMessageBox}>
                        <Text style={styles.previewMessageText}>
                          {actionMessage}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.previewActions}>
                      {(detail.job.status === 'FAILED' ||
                        detail.job.status === 'QUEUED') && (
                        <Pressable
                          style={({pressed}) => [
                            styles.previewActionButton,
                            pressed && styles.previewActionPressed,
                            actionBusy && styles.previewActionDisabled,
                          ]}
                          onPress={() => handleRetry(detail.job._id)}
                          disabled={actionBusy}
                          accessibilityRole="button"
                          accessibilityLabel="Retry print job">
                          {actionBusy ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.primary}
                            />
                          ) : (
                            <Text style={styles.previewActionText}>Retry</Text>
                          )}
                        </Pressable>
                      )}
                      {detail.job.status !== 'PRINTED' &&
                        detail.job.status !== 'CANCELLED' && (
                          <Pressable
                            style={({pressed}) => [
                              styles.previewActionButton,
                              styles.previewActionSuccess,
                              pressed && styles.previewActionPressed,
                              actionBusy && styles.previewActionDisabled,
                            ]}
                            onPress={() => handleMarkPrinted(detail.job._id)}
                            disabled={actionBusy}
                            accessibilityRole="button"
                            accessibilityLabel="Mark printed">
                            <Text
                              style={[
                                styles.previewActionText,
                                styles.previewActionTextSuccess,
                              ]}>
                              Mark Printed
                            </Text>
                          </Pressable>
                        )}
                      {detail.job.status === 'QUEUED' && (
                        <Pressable
                          style={({pressed}) => [
                            styles.previewActionButton,
                            styles.previewActionPrimary,
                            pressed && styles.previewActionPressed,
                            actionBusy && styles.previewActionDisabled,
                          ]}
                          onPress={() => handlePrintTest(detail.job._id)}
                          disabled={actionBusy}
                          accessibilityRole="button"
                          accessibilityLabel="Print test">
                          <Text
                            style={[
                              styles.previewActionText,
                              styles.previewActionTextPrimary,
                            ]}>
                            Print Test
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={({pressed}) => [
                          styles.previewActionButton,
                          pressed && styles.previewActionPressed,
                        ]}
                        onPress={() => setPreviewOpen(false)}
                        accessibilityRole="button"
                        accessibilityLabel="Close preview">
                        <Text style={styles.previewActionText}>Close</Text>
                      </Pressable>
                    </View>
                  </View>
                ),
              }
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingVertical: 16,
  },
  content: {
    flex: 1,
  },
  contentFull: {
    maxWidth: '100%',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  backButtonPressed: {
    backgroundColor: colors.cream,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  refreshButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonPressed: {
    backgroundColor: colors.cream,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  bodyLandscape: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  bodyPortrait: {
    flexDirection: 'column',
  },
  listSection: {
    flex: 1,
  },
  listSectionSplit: {
    flex: 0.65,
  },
  detailSection: {
    flex: 1,
  },
  detailSectionSplit: {
    flex: 0.35,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  detailSectionStacked: {
    minHeight: 280,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  listCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
  previewPanel: {
    gap: 8,
    paddingBottom: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  previewStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  previewErrorBox: {
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  previewErrorText: {
    fontSize: 12,
    color: '#991B1B',
  },
  previewMessageBox: {
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewMessageText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  previewActions: {
    marginTop: 12,
    gap: 8,
  },
  previewActionButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  previewActionPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  previewActionSuccess: {
    borderColor: colors.success,
  },
  previewActionPressed: {
    opacity: 0.9,
  },
  previewActionDisabled: {
    opacity: 0.55,
  },
  previewActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  previewActionTextPrimary: {
    color: colors.surface,
  },
  previewActionTextSuccess: {
    color: colors.success,
  },
});