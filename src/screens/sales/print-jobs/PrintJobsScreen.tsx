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
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  RefreshCw,
} from 'lucide-react-native';
import {ReceiptPreview} from '../../../components/payment/ReceiptPreview';
import {TabletModal} from '../../../components/common/TabletModal';
import {PrintJobCard} from '../../../components/print-jobs/PrintJobCard';
import {PrintJobDetailPanel} from '../../../components/print-jobs/PrintJobDetailPanel';
import {PrintJobFilters} from '../../../components/print-jobs/PrintJobFilters';
import {PrintJobKpiCards} from '../../../components/print-jobs/PrintJobKpiCards';
import {PrintJobStatusBadge} from '../../../components/print-jobs/PrintJobStatusBadge';
import {ReprintConfirmModal} from '../../../components/print-jobs/ReprintConfirmModal';
import {colors} from '../../../constants/colors';
import type {SalesStackParamList} from '../../../navigation/types';
import {usePrintJobStore} from '../../../store/printJobStore';
import type {PrintJob} from '../../../types/printJob';
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

function EmptyState({hasFilters}: {hasFilters: boolean}) {
  const message = hasFilters
    ? 'No print jobs match your filters.'
    : 'No print jobs found.';
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
  const statusFilter = usePrintJobStore((s) => s.statusFilter);
  const typeFilter = usePrintJobStore((s) => s.typeFilter);
  const targetFilter = usePrintJobStore((s) => s.targetFilter);
  const reprintOnly = usePrintJobStore((s) => s.reprintOnly);
  const searchQuery = usePrintJobStore((s) => s.searchQuery);
  const page = usePrintJobStore((s) => s.page);
  const pagination = usePrintJobStore((s) => s.pagination);
  const serverStats = usePrintJobStore((s) => s.serverStats);
  const printers = usePrintJobStore((s) => s.printers);
  const detail = usePrintJobStore((s) => s.detail);
  const loading = usePrintJobStore((s) => s.loading);
  const refreshing = usePrintJobStore((s) => s.refreshing);
  const detailLoading = usePrintJobStore((s) => s.detailLoading);
  const actionBusy = usePrintJobStore((s) => s.actionBusy);
  const reprinting = usePrintJobStore((s) => s.reprinting);
  const error = usePrintJobStore((s) => s.error);
  const actionMessage = usePrintJobStore((s) => s.actionMessage);

  const fetchList = usePrintJobStore((s) => s.fetchList);
  const fetchPrintersList = usePrintJobStore((s) => s.fetchPrintersList);
  const setStatusFilter = usePrintJobStore((s) => s.setStatusFilter);
  const setTypeFilter = usePrintJobStore((s) => s.setTypeFilter);
  const setTargetFilter = usePrintJobStore((s) => s.setTargetFilter);
  const setReprintOnly = usePrintJobStore((s) => s.setReprintOnly);
  const setSearchQuery = usePrintJobStore((s) => s.setSearchQuery);
  const setPage = usePrintJobStore((s) => s.setPage);
  const resetFilters = usePrintJobStore((s) => s.resetFilters);
  const selectJob = usePrintJobStore((s) => s.selectJob);
  const retry = usePrintJobStore((s) => s.retry);
  const reprint = usePrintJobStore((s) => s.reprint);
  const clearActionMessage = usePrintJobStore((s) => s.clearActionMessage);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [reprintTarget, setReprintTarget] = useState<PrintJob | null>(null);

  const deepLinkJobId = route.params?.jobId;

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedJobId) ?? detail?.job ?? null,
    [jobs, selectedJobId, detail?.job],
  );

  useFocusEffect(
    useCallback(() => {
      fetchList({silent: jobs.length > 0});
      fetchPrintersList();
    }, [fetchList, fetchPrintersList, jobs.length]),
  );

  useEffect(() => {
    if (deepLinkJobId) {
      selectJob(deepLinkJobId);
    }
  }, [deepLinkJobId, selectJob]);

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    targetFilter !== 'ALL' ||
    reprintOnly ||
    Boolean(searchQuery.trim());

  const onRefresh = useCallback(() => {
    clearActionMessage();
    fetchList({silent: true});
  }, [fetchList, clearActionMessage]);

  const handleSelectJob = useCallback(
    (job: PrintJob) => {
      clearActionMessage();
      selectJob(job._id);
    },
    [selectJob, clearActionMessage],
  );

  const handleOpenPreview = useCallback(() => {
    if (detail) {
      setPreviewOpen(true);
    }
  }, [detail]);

  const handleRetry = useCallback(
    async (id: string) => {
      try {
        await retry(id);
      } catch {
        // Handled by store actionMessage
      }
    },
    [retry],
  );

  const handleConfirmReprint = useCallback(async () => {
    if (!reprintTarget) return;
    const targetId = reprintTarget._id;
    const res = await reprint(targetId);
    if (res.success) {
      setReprintTarget(null);
    }
  }, [reprintTarget, reprint]);

  const renderItem = useCallback(
    ({item}: {item: PrintJob}) => (
      <PrintJobCard
        job={item}
        selected={item._id === selectedJobId}
        actionBusy={(actionBusy || reprinting) && item._id === selectedJobId}
        onPress={handleSelectJob}
        onView={() => {
          void selectJob(item._id).then(() => setPreviewOpen(true)).catch(() => {});
        }}
        onRetry={(job) => {
          void handleRetry(job._id);
        }}
        onPrintAgain={(job) => setReprintTarget(job)}
      />
    ),
    [selectedJobId, actionBusy, reprinting, handleSelectJob, selectJob, handleRetry],
  );

  const previewContent = useMemo(() => {
    if (!detail) {
      return null;
    }
    const receiptOrder = buildReceiptOrderFromDetail(detail);
    const ticketItems = getTicketItems(detail);
    const mode = printTypeToReceiptMode(detail.job.printType);
    const isReprint = Boolean(
      detail.job.parentPrintJobId ||
        detail.job.metadata?.isReprint ||
        (detail.job.attemptCount && detail.job.attemptCount > 1),
    );

    return {
      mode,
      order: receiptOrder,
      kotItems: ticketItems,
      serverName: detail.serverName ?? detail.job.metadata?.serverName,
      guestCount: detail.guestCount ?? detail.job.metadata?.guestCount,
      specialNote: detail.job.metadata?.specialNote,
      restaurantName:
        detail.restaurant?.name ?? detail.job.metadata?.restaurantName,
      isReprint,
    };
  }, [detail]);

  const totalCount = pagination?.total ?? jobs.length;

  const listSection = (
    <View style={[styles.listSection, isMasterDetail && styles.listSectionSplit]}>
      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionLabel}>PRINT JOBS</Text>
        {totalCount > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{totalCount}</Text>
          </View>
        )}
      </View>

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
            ListEmptyComponent={
              !loading ? <EmptyState hasFilters={hasActiveFilters} /> : undefined
            }
          />

          {/* Server Pagination Bar */}
          {pagination && pagination.totalPages > 1 && (
            <View style={styles.paginationBar}>
              <Text style={styles.paginationText}>
                Page <Text style={styles.paginationBold}>{pagination.page}</Text>{' '}
                of{' '}
                <Text style={styles.paginationBold}>
                  {pagination.totalPages}
                </Text>{' '}
                ({pagination.total} total)
              </Text>

              <View style={styles.paginationButtons}>
                <Pressable
                  style={({pressed}) => [
                    styles.pageBtn,
                    pressed && styles.pageBtnPressed,
                    page <= 1 && styles.pageBtnDisabled,
                  ]}
                  disabled={page <= 1 || loading}
                  onPress={() => setPage(Math.max(1, page - 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Previous page">
                  <ChevronLeft size={16} color={colors.text} />
                  <Text style={styles.pageBtnText}>Prev</Text>
                </Pressable>

                <Pressable
                  style={({pressed}) => [
                    styles.pageBtn,
                    pressed && styles.pageBtnPressed,
                    page >= pagination.totalPages && styles.pageBtnDisabled,
                  ]}
                  disabled={page >= pagination.totalPages || loading}
                  onPress={() => setPage(page + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Next page">
                  <Text style={styles.pageBtnText}>Next</Text>
                  <ChevronRight size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>
          )}
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
        reprinting={reprinting}
        actionMessage={actionMessage}
        onView={detail ? handleOpenPreview : undefined}
        onRetry={
          selectedJob && selectedJob.status === 'FAILED'
            ? () => handleRetry(selectedJob._id)
            : undefined
        }
        onPrintAgain={
          selectedJob ? () => setReprintTarget(selectedJob) : undefined
        }
        onSelectOriginalJob={(origId) => selectJob(origId)}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.content, {width: contentWidth}, styles.contentFull]}>
        {/* Page Header */}
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

            <View style={styles.titleWithIcon}>
              <View style={styles.titleRow}>
                <Printer size={22} color={colors.primary} strokeWidth={2.4} />
                <Text style={styles.pageTitle}>Print Jobs</Text>
                {totalCount > 0 && (
                  <View style={styles.headerCountBadge}>
                    <Text style={styles.headerCountText}>{totalCount}</Text>
                  </View>
                )}
              </View>
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
            <RefreshCw
              size={14}
              color={colors.text}
              strokeWidth={2.2}
              style={refreshing ? styles.rotatingIcon : undefined}
            />
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Text>
          </Pressable>
        </View>

        {/* KPI Metric Cards */}
        <PrintJobKpiCards
          stats={serverStats}
          jobsCount={totalCount}
          loading={loading}
          activeStatusFilter={statusFilter}
          activeTypeFilter={typeFilter}
          reprintOnly={reprintOnly}
          onSelectTotal={() => {
            clearActionMessage();
            resetFilters();
          }}
          onSelectReceipt={() => {
            clearActionMessage();
            setTypeFilter(typeFilter === 'RECEIPT' ? 'ALL' : 'RECEIPT');
          }}
          onSelectKot={() => {
            clearActionMessage();
            setTypeFilter(typeFilter === 'KOT' ? 'ALL' : 'KOT');
          }}
          onSelectBar={() => {
            clearActionMessage();
            setTypeFilter(typeFilter === 'BAR_RECEIPT' ? 'ALL' : 'BAR_RECEIPT');
          }}
          onSelectReprint={() => {
            clearActionMessage();
            setReprintOnly(!reprintOnly);
          }}
          onSelectPrinted={() => {
            clearActionMessage();
            setStatusFilter(statusFilter === 'PRINTED' ? 'ALL' : 'PRINTED');
          }}
          onSelectFailed={() => {
            clearActionMessage();
            setStatusFilter(statusFilter === 'FAILED' ? 'ALL' : 'FAILED');
          }}
        />

        {/* Multi-facet Filters with Search & Reset */}
        <PrintJobFilters
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            clearActionMessage();
            setSearchQuery(q);
          }}
          statusFilter={statusFilter}
          onStatusChange={(s) => {
            clearActionMessage();
            setStatusFilter(s);
          }}
          typeFilter={typeFilter}
          onTypeChange={(t) => {
            clearActionMessage();
            setTypeFilter(t);
          }}
          targetFilter={targetFilter}
          onTargetChange={(tgt) => {
            clearActionMessage();
            setTargetFilter(tgt);
          }}
          reprintOnly={reprintOnly}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={() => {
            clearActionMessage();
            resetFilters();
          }}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Unable to load print jobs.</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchList({silent: false})}
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

      {/* Reprint Confirmation Modal */}
      <ReprintConfirmModal
        visible={Boolean(reprintTarget)}
        job={reprintTarget}
        reprinting={reprinting}
        onConfirm={handleConfirmReprint}
        onCancel={() => {
          if (!reprinting) setReprintTarget(null);
        }}
      />

      {/* Preview TabletModal */}
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
                    isReprint={previewContent.isReprint}
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
                      <Pressable
                        style={({pressed}) => [
                          styles.previewActionButton,
                          styles.previewActionPrimary,
                          pressed && styles.previewActionPressed,
                          (actionBusy || reprinting) &&
                            styles.previewActionDisabled,
                        ]}
                        onPress={() => setReprintTarget(detail.job)}
                        disabled={actionBusy || reprinting}
                        accessibilityRole="button"
                        accessibilityLabel="Print ticket again">
                        <Text
                          style={[
                            styles.previewActionText,
                            styles.previewActionTextPrimary,
                          ]}>
                          Print Again
                        </Text>
                      </Pressable>

                      {detail.job.status === 'FAILED' && (
                        <Pressable
                          style={({pressed}) => [
                            styles.previewActionButton,
                            styles.previewActionRetry,
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
                              color={colors.error}
                            />
                          ) : (
                            <Text style={styles.previewActionTextRetry}>Retry</Text>
                          )}
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
    paddingVertical: 12,
  },
  content: {
    flex: 1,
  },
  contentFull: {
    maxWidth: '100%',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  titleWithIcon: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },
  headerCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCountText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.textSecondary,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  refreshButtonPressed: {
    backgroundColor: colors.cream,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  rotatingIcon: {
    opacity: 0.7,
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
    flex: 0.62,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    marginLeft: 4,
  },
  countPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  detailSection: {
    flex: 1,
  },
  detailSectionSplit: {
    flex: 0.38,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  detailSectionStacked: {
    minHeight: 320,
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
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  paginationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paginationBold: {
    fontWeight: '700',
    color: colors.text,
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  pageBtnPressed: {
    backgroundColor: colors.cream,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  retryButton: {
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 13,
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
    minHeight: 44,
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
  previewActionRetry: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  previewActionPressed: {
    opacity: 0.9,
  },
  previewActionDisabled: {
    opacity: 0.55,
  },
  previewActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  previewActionTextPrimary: {
    color: colors.surface,
  },
  previewActionTextRetry: {
    color: colors.error,
  },
});
