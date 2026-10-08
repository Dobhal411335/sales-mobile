import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ArrowRight,
  Check,
  DoorOpen,
  Plus,
  Printer,
  Users,
  X,
} from 'lucide-react-native';
import {ConfirmDialog} from '../../../components/common/ConfirmDialog';
import {PrintJobStatusStrip} from '../../../components/printing/PrintJobStatusStrip';
import {ReceiptPreview} from '../../../components/payment/ReceiptPreview';
import {toast} from '../../../components/common/Toast';
import {colors} from '../../../constants/colors';
import {config} from '../../../constants/config';
import type {SalesStackParamList} from '../../../navigation/types';
import {
  formatAmountForPriceDisplay,
  showPriceDisplayAmount,
} from '../../../display/priceDisplay';
import {printerService} from '../../../printer/printerService';
import {reprintTicket} from '../../../services/printJobService';
import {releaseTableSession} from '../../../services/sessionService';
import {isPaymentApiConfigured} from '../../../services/paymentService';
import {useCartStore} from '../../../store/cartStore';
import {formatCurrency} from '../../../utils/currency';
import {buildPaymentSplitReceiptSlips} from '../../../utils/receiptSlips';

type Props = NativeStackScreenProps<SalesStackParamList, 'Receipt'>;

function money(n: number | undefined | null) {
  return formatCurrency(Number(n) || 0);
}

export function ReceiptScreen({navigation, route}: Props) {
  const {
    orderSnapshot,
    sessionId,
    orderType,
    tableId,
    taxBreakdown,
    printJobId,
    printJobIds,
  } = route.params;
  const resetOrderState = useCartStore((state) => state.resetOrderState);

  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  /** When true, cancel on release dialog navigates away (Done flow). */
  const [releaseAfterDone, setReleaseAfterDone] = useState(false);
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [tableReleased, setTableReleased] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const primaryPrintJobId =
    printJobId ??
    (Array.isArray(printJobIds) && printJobIds.length > 0
      ? printJobIds[0]
      : null);
  const [activePrintJobId, setActivePrintJobId] = useState<string | null>(
    primaryPrintJobId,
  );
  const [isReprint, setIsReprint] = useState(Boolean(orderSnapshot.isReprint));
  const [reprinting, setReprinting] = useState(false);
  const [activeSlipIndex, setActiveSlipIndex] = useState(0);
  const localPrintStarted = useRef(false);

  const receiptSlips = useMemo(() => {
    const slips = buildPaymentSplitReceiptSlips(orderSnapshot);
    if (!slips?.length) {
      return null;
    }
    const ids = Array.isArray(printJobIds) ? printJobIds : [];
    return slips.map((slip, index) => ({
      ...slip,
      jobId: ids[index] ? String(ids[index]) : slip.jobId,
    }));
  }, [orderSnapshot, printJobIds]);

  const activeReceiptSlip =
    receiptSlips && receiptSlips[activeSlipIndex]
      ? receiptSlips[activeSlipIndex]
      : null;

  const checkScale = useRef(new Animated.Value(0.4)).current;
  const pulse = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.35,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [checkScale, pulse]);

  const effectiveTaxBreakdown = taxBreakdown ?? orderSnapshot.taxBreakdown;
  const isTableSession = orderType === 'table' && Boolean(sessionId);
  const isPartial =
    String(orderSnapshot.paymentStatus || '').toUpperCase() === 'PARTIAL';

  const splitRows = useMemo(() => {
    const rows = Array.isArray(orderSnapshot.paymentSplits)
      ? orderSnapshot.paymentSplits
      : [];
    return rows.map((row, index) => {
      const tip = Number(row.tipAmount) || 0;
      const cash = Number(row.cashAmount) || 0;
      const card = Number(row.cardAmount) || 0;
      const gift =
        Number((row as {giftAmount?: number}).giftAmount) ||
        Number((row as {giftcardUsedAmount?: number}).giftcardUsedAmount) ||
        0;
      const amount = Number(row.amount) || cash + card + gift || 0;
      return {
        id: String((row as {_id?: string})._id || `split-${index}`),
        name: String(row.name || `Guest ${index + 1}`).trim(),
        method: String(row.method || row.paymentMethod || '—').trim(),
        cardType: row.cardType ? String(row.cardType) : '',
        amount,
        tip,
        cash,
        card,
        gift,
      };
    });
  }, [orderSnapshot.paymentSplits]);

  const grandTotal = useMemo(() => {
    if (splitRows.length) {
      const fromSplits = splitRows.reduce(
        (sum, s) => sum + s.amount + s.tip,
        0,
      );
      if (fromSplits > 0.009) return fromSplits;
    }
    return (
      Number(orderSnapshot.totalAmount ?? 0) +
      Number(orderSnapshot.tipAmount ?? 0)
    );
  }, [orderSnapshot.tipAmount, orderSnapshot.totalAmount, splitRows]);

  const party =
    orderSnapshot.partyName ||
    orderSnapshot.guestName ||
    (orderSnapshot as {party?: string}).party ||
    '';
  const locationParts = [
    orderSnapshot.tableNo || orderSnapshot.tableNumber,
    orderSnapshot.floorName,
  ].filter(Boolean);
  const location = locationParts.length
    ? locationParts.join(' · ')
    : orderType === 'takeaway'
      ? 'Takeaway'
      : orderType === 'staff'
        ? 'Staff'
        : '';

  // Local-first customer receipt print
  useEffect(() => {
    if (localPrintStarted.current) return;
    if (orderSnapshot.isReprint) return;
    localPrintStarted.current = true;

    const jobIds =
      Array.isArray(printJobIds) && printJobIds.length > 0
        ? printJobIds
        : primaryPrintJobId
          ? [primaryPrintJobId]
          : [null];

    void (async () => {
      for (const jobId of jobIds) {
        try {
          const result = await printerService.printBill(
            {
              order: orderSnapshot,
              taxBreakdown: effectiveTaxBreakdown,
              guestCount: orderSnapshot.guestCount,
              restaurantName:
                orderSnapshot.restaurantName || config.APP_NAME.toUpperCase(),
              isReprint: false,
            },
            jobId,
          );
          if (result.printedLocally) {
            setPrintMessage(result.message || 'Receipt printed');
          }
        } catch (err) {
          console.warn('[ReceiptScreen] local print error:', err);
        }
      }
    })();
  }, [
    effectiveTaxBreakdown,
    orderSnapshot,
    primaryPrintJobId,
    printJobIds,
  ]);

  useEffect(() => {
    void showPriceDisplayAmount(
      formatAmountForPriceDisplay(grandTotal),
      'collect',
    );
  }, [grandTotal]);

  const goToFloor = useCallback(() => {
    resetOrderState();
    navigation.navigate('Floor');
  }, [navigation, resetOrderState]);

  const goToHub = useCallback(() => {
    resetOrderState();
    if (orderType === 'staff') {
      navigation.navigate('StaffHub');
      return;
    }
    if (orderType === 'takeaway') {
      navigation.navigate('TakeAwayHub');
      return;
    }
    navigation.navigate('Floor');
  }, [navigation, orderType, resetOrderState]);

  const goToNewOrder = useCallback(() => {
    resetOrderState();
    if (isTableSession && sessionId && !tableReleased) {
      navigation.navigate('CreateOrder', {
        orderType: 'table',
        sessionId,
        tableId,
        fresh: true,
      });
      return;
    }
    if (orderType === 'staff') {
      navigation.navigate('StaffHub');
      return;
    }
    if (orderType === 'takeaway') {
      navigation.navigate('TakeAwayHub');
      return;
    }
    navigation.navigate('Floor');
  }, [
    isTableSession,
    navigation,
    orderType,
    resetOrderState,
    sessionId,
    tableId,
    tableReleased,
  ]);

  const releaseSession = useCallback(async () => {
    if (!sessionId || !isPaymentApiConfigured()) return false;
    setReleasing(true);
    try {
      await releaseTableSession(sessionId);
      setTableReleased(true);
      toast.success('Table released');
      return true;
    } catch (error) {
      Alert.alert(
        'Release failed',
        error instanceof Error
          ? error.message
          : 'Could not release table. You can release from the floor.',
      );
      return false;
    } finally {
      setReleasing(false);
    }
  }, [sessionId]);

  const handleDone = () => {
    if (isTableSession && !tableReleased) {
      setReleaseAfterDone(true);
      setReleaseDialogOpen(true);
      return;
    }
    goToHub();
  };

  const openReleaseDialog = () => {
    setReleaseAfterDone(false);
    setReleaseDialogOpen(true);
  };

  const handleNewOrder = () => {
    if (isTableSession && !tableReleased) {
      setNewOrderDialogOpen(true);
      return;
    }
    if (tableReleased) {
      goToFloor();
      return;
    }
    goToNewOrder();
  };

  const handleReleaseConfirm = async () => {
    setReleaseDialogOpen(false);
    const ok = await releaseSession();
    if (ok) goToFloor();
    else goToFloor();
  };

  const handleReprintBill = async () => {
    const orderId =
      orderSnapshot.orderId || (orderSnapshot as {_id?: string})._id;
    const slipJobId =
      activeReceiptSlip?.jobId ||
      (Array.isArray(printJobIds) && printJobIds[activeSlipIndex]
        ? String(printJobIds[activeSlipIndex])
        : null) ||
      activePrintJobId;
    const slipOrder = activeReceiptSlip?.order || orderSnapshot;
    const slipMeta = activeReceiptSlip?.jobMetadata || null;

    setReprinting(true);
    try {
      if (orderId || slipJobId) {
        const res = await reprintTicket({
          orderId: orderId ? String(orderId) : undefined,
          jobId: slipJobId ?? undefined,
          printType: 'RECEIPT',
          guestCount: orderSnapshot.guestCount,
          restaurantName: config.APP_NAME.toUpperCase(),
        });

        if (res.success) {
          setIsReprint(true);
          if (res.data?.job?._id) {
            setActivePrintJobId(res.data.job._id);
          }
          toast.success(
            receiptSlips && receiptSlips.length > 1
              ? 'Seat receipt reprint queued'
              : 'Receipt reprint queued',
          );
          return;
        }
      }

      const result = await printerService.printBill(
        {
          order: {
            ...slipOrder,
            paidAt:
              (orderSnapshot as {paidAt?: string}).paidAt ||
              new Date().toISOString(),
            filterReceiptBySeat: Boolean(slipMeta?.filterReceiptBySeat),
          } as typeof orderSnapshot,
          taxBreakdown: effectiveTaxBreakdown,
          guestCount: orderSnapshot.guestCount,
          restaurantName: config.APP_NAME.toUpperCase(),
          isReprint: true,
        },
        slipJobId ?? undefined,
      );
      if (result.success) {
        setIsReprint(true);
        toast.success('Receipt reprint queued');
      } else {
        toast.error(result.message || 'Failed to queue receipt reprint');
      }
    } catch {
      const result = await printerService.printBill(
        {
          order: {
            ...slipOrder,
            paidAt:
              (orderSnapshot as {paidAt?: string}).paidAt ||
              new Date().toISOString(),
            filterReceiptBySeat: Boolean(slipMeta?.filterReceiptBySeat),
          } as typeof orderSnapshot,
          taxBreakdown: effectiveTaxBreakdown,
          guestCount: orderSnapshot.guestCount,
          restaurantName: config.APP_NAME.toUpperCase(),
          isReprint: true,
        },
        slipJobId ?? undefined,
      );
      if (result.success) {
        setIsReprint(true);
        toast.success('Receipt reprint queued');
      } else {
        toast.error('Network error reprinting receipt');
      }
    } finally {
      setReprinting(false);
    }
  };

  const handleViewPrintJob = (jobId: string) => {
    navigation.navigate('PrintJobs', {jobId});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.bgGlowTop} pointerEvents="none" />
      <View style={styles.bgGlowBottom} pointerEvents="none" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.checkWrap}>
            <Animated.View
              style={[styles.pulseRing, {transform: [{scale: pulse}]}]}
            />
            <Animated.View
              style={[styles.checkCircle, {transform: [{scale: checkScale}]}]}>
              <Check color="#FFFFFF" size={40} strokeWidth={3} />
            </Animated.View>
          </View>
          <Text style={styles.eyebrow}>
            {isPartial ? 'Payment recorded' : 'Order completed'}
          </Text>
          <Text style={styles.title}>Thank you</Text>
          <Text style={styles.subtitle}>
            {isPartial
              ? 'Receipt slip is on the way to the printer.'
              : 'Payment collected · receipt is printing.'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardLabel}>Order</Text>
              <Text style={styles.orderNumber}>
                #{orderSnapshot.orderNumber || '—'}
              </Text>
              {party ? (
                <Text style={styles.partyText}>Party · {party}</Text>
              ) : null}
              {location ? (
                <Text style={styles.locationText}>{location}</Text>
              ) : null}
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardLabel}>Collected</Text>
              <Text style={styles.collected}>{money(grandTotal)}</Text>
              <Text style={styles.methodText}>
                {String(orderSnapshot.paymentMethod || '').trim() ||
                  (isPartial ? 'Partial' : 'Paid')}
              </Text>
            </View>
          </View>

          <View style={styles.totalsRow}>
            <View style={styles.totalCell}>
              <Text style={styles.totalCellLabel}>Subtotal</Text>
              <Text style={styles.totalCellValue}>
                {money(orderSnapshot.subTotal)}
              </Text>
            </View>
            <View style={styles.totalCell}>
              <Text style={styles.totalCellLabel}>Tax</Text>
              <Text style={styles.totalCellValue}>
                {money(orderSnapshot.taxTotal)}
              </Text>
            </View>
            <View style={styles.totalCell}>
              <Text style={styles.totalCellLabel}>Tip</Text>
              <Text style={styles.totalCellValue}>
                {money(orderSnapshot.tipAmount)}
              </Text>
            </View>
            <View style={styles.totalCell}>
              <Text style={styles.totalCellLabel}>Server</Text>
              <Text style={styles.totalCellValue} numberOfLines={1}>
                {orderSnapshot.processedByName ||
                  (orderSnapshot as {serverName?: string}).serverName ||
                  '—'}
              </Text>
            </View>
          </View>
        </View>

        {splitRows.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.splitHeader}>
              <Users color="#4F46E5" size={16} />
              <Text style={styles.splitHeaderText}>
                {splitRows.length > 1 ? 'Seats & splits' : 'Payment group'}
              </Text>
            </View>
            {splitRows.map((row) => (
              <View key={row.id} style={styles.splitRow}>
                <View style={styles.splitLeft}>
                  <Text style={styles.splitName}>{row.name}</Text>
                  <Text style={styles.splitMeta}>
                    {row.method}
                    {row.cardType ? ` · ${row.cardType}` : ''}
                    {row.cash > 0 ? ` · Cash ${money(row.cash)}` : ''}
                    {row.card > 0 ? ` · Card ${money(row.card)}` : ''}
                    {row.gift > 0 ? ` · Gift ${money(row.gift)}` : ''}
                    {row.tip > 0 ? ` · Tip ${money(row.tip)}` : ''}
                  </Text>
                </View>
                <Text style={styles.splitAmount}>
                  {money(row.amount + row.tip)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <PrintJobStatusStrip
          printJobId={activePrintJobId}
          label="Receipt print job"
          onViewJob={handleViewPrintJob}
        />
        {printMessage ? (
          <Text style={styles.printMessage}>{printMessage}</Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={styles.newOrderBtn}
            onPress={handleNewOrder}
            accessibilityRole="button"
            accessibilityLabel="New order">
            <Plus color="#FFFFFF" size={20} />
            <Text style={styles.newOrderText}>New order</Text>
          </Pressable>

          <View
            style={[
              styles.rowActions,
              isTableSession && !tableReleased
                ? styles.rowActions3
                : styles.rowActions2,
            ]}>
            <Pressable
              style={[styles.rowBtn, styles.printBtn, reprinting && styles.disabled]}
              onPress={() => {
                setPrintPreviewOpen(true);
                void handleReprintBill();
              }}
              disabled={reprinting}
              accessibilityRole="button"
              accessibilityLabel="Print bill">
              {reprinting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Printer color="#FFFFFF" size={18} />
                  <Text style={styles.rowBtnText} numberOfLines={1}>
                    Print bill
                    {Array.isArray(printJobIds) && printJobIds.length > 1
                      ? ` (${printJobIds.length})`
                      : ''}
                  </Text>
                </>
              )}
            </Pressable>

            {isTableSession && !tableReleased ? (
              <Pressable
                style={[styles.rowBtn, styles.releaseBtn, releasing && styles.disabled]}
                onPress={openReleaseDialog}
                disabled={releasing}
                accessibilityRole="button"
                accessibilityLabel="Release table">
                {releasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <DoorOpen color="#FFFFFF" size={18} />
                    <Text style={styles.rowBtnText} numberOfLines={1}>
                      Release
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.rowBtn, styles.doneBtn]}
              onPress={handleDone}
              accessibilityRole="button"
              accessibilityLabel="Done">
              <Text style={styles.rowBtnText}>Done</Text>
              <ArrowRight color="#FFFFFF" size={18} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.footerHint}>
          {tableReleased
            ? 'Table released — start a new sitting from the floor.'
            : receiptSlips && receiptSlips.length > 1
              ? 'Print bill opens each seat/group receipt.'
              : 'You can reprint the customer receipt anytime from Print bill.'}
        </Text>
      </ScrollView>

      <Modal
        visible={printPreviewOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrintPreviewOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {receiptSlips && receiptSlips.length > 1
                ? 'Seat bill preview'
                : 'Bill preview'}
            </Text>
            <Pressable
              onPress={() => setPrintPreviewOpen(false)}
              style={styles.modalClose}
              accessibilityRole="button"
              accessibilityLabel="Close preview">
              <X color={colors.textSecondary} size={20} />
            </Pressable>
          </View>
          {receiptSlips && receiptSlips.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.slipTabsRow}
              style={styles.slipTabsScroll}>
              {receiptSlips.map((slip, idx) => {
                const active = activeSlipIndex === idx;
                return (
                  <Pressable
                    key={slip.id}
                    style={[styles.slipTab, active && styles.slipTabActive]}
                    onPress={() => {
                      setActiveSlipIndex(idx);
                      if (slip.jobId) {
                        setActivePrintJobId(slip.jobId);
                      }
                    }}>
                    <Text
                      style={[
                        styles.slipTabText,
                        active && styles.slipTabTextActive,
                      ]}>
                      {slip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <ReceiptPreview
              mode="customer"
              order={activeReceiptSlip?.order || orderSnapshot}
              taxBreakdown={
                activeReceiptSlip?.order.taxBreakdown || effectiveTaxBreakdown
              }
              guestCount={orderSnapshot.guestCount}
              restaurantName={config.APP_NAME.toUpperCase()}
              serverName={
                (orderSnapshot as {serverName?: string; processedByName?: string})
                  .serverName ||
                (orderSnapshot as {serverName?: string; processedByName?: string})
                  .processedByName
              }
              isReprint={isReprint}
              jobMetadata={activeReceiptSlip?.jobMetadata ?? null}
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.modalSecondary, reprinting && styles.disabled]}
              onPress={handleReprintBill}
              disabled={reprinting}>
              {reprinting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.modalSecondaryText}>
                  {isReprint
                    ? receiptSlips && receiptSlips.length > 1
                      ? 'Reprint this slip'
                      : 'Reprint again'
                    : receiptSlips && receiptSlips.length > 1
                      ? 'Print this slip'
                      : 'Reprint bill'}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalPrimary}
              onPress={() => setPrintPreviewOpen(false)}>
              <Text style={styles.modalPrimaryText}>Close</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <ConfirmDialog
        visible={releaseDialogOpen}
        title="Release Table?"
        message="Payment is complete. Do you want to release this table now?"
        confirmLabel="Yes, Release"
        cancelLabel="Not now"
        onConfirm={handleReleaseConfirm}
        onCancel={() => {
          setReleaseDialogOpen(false);
          if (releaseAfterDone) {
            setReleaseAfterDone(false);
            goToHub();
          }
        }}
      />

      <ConfirmDialog
        visible={newOrderDialogOpen}
        title="Release this table?"
        message="You chose New order before releasing the table. Release it now and pick a table on the floor, or keep this table open and start another order here."
        confirmLabel="Yes, release table"
        cancelLabel="No, keep table · new order here"
        onConfirm={async () => {
          setNewOrderDialogOpen(false);
          const ok = await releaseSession();
          if (ok) goToFloor();
        }}
        onCancel={() => {
          setNewOrderDialogOpen(false);
          goToNewOrder();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgGlowTop: {
    position: 'absolute',
    top: -40,
    left: '10%',
    right: '10%',
    height: 220,
    borderRadius: 160,
    backgroundColor: 'rgba(251,146,60,0.18)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: 40,
    right: -20,
    width: 220,
    height: 180,
    borderRadius: 120,
    backgroundColor: 'rgba(16,185,129,0.10)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 8,
  },
  checkWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16,185,129,0.22)',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#047857',
  },
  title: {
    marginTop: 6,
    fontSize: 34,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  orderNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
  },
  partyText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  collected: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.success,
  },
  methodText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  totalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
    paddingTop: 14,
    gap: 12,
  },
  totalCell: {
    width: '45%',
    flexGrow: 1,
  },
  totalCellLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  totalCellValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#4F46E5',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F4F4F5',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  splitLeft: {
    flex: 1,
    gap: 2,
  },
  splitName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  splitMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  splitAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
  },
  printMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  newOrderBtn: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newOrderText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rowActions2: {},
  rowActions3: {},
  rowBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  printBtn: {
    backgroundColor: '#18181B',
  },
  releaseBtn: {
    backgroundColor: '#047857',
  },
  doneBtn: {
    backgroundColor: colors.primary,
  },
  rowBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.6,
  },
  footerHint: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slipTabsScroll: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slipTabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slipTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  slipTabActive: {
    backgroundColor: colors.primary,
  },
  slipTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  slipTabTextActive: {
    color: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  modalScroll: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalSecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  modalPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
