import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ConfirmDialog} from '../../../components/common/ConfirmDialog';
import {PrintJobStatusStrip} from '../../../components/printing/PrintJobStatusStrip';
import {ReceiptPreview} from '../../../components/payment/ReceiptPreview';
import {toast} from '../../../components/common/Toast';
import {colors} from '../../../constants/colors';
import {config} from '../../../constants/config';
import type {SalesStackParamList} from '../../../navigation/types';
import {printerService} from '../../../printer/printerService';
import {reprintTicket} from '../../../services/printJobService';
import {releaseTableSession} from '../../../services/sessionService';
import {isPaymentApiConfigured} from '../../../services/paymentService';
import {useCartStore} from '../../../store/cartStore';
import {formatCurrency} from '../../../utils/currency';

type Props = NativeStackScreenProps<SalesStackParamList, 'Receipt'>;

export function ReceiptScreen({navigation, route}: Props) {
  const {orderSnapshot, sessionId, orderType, taxBreakdown, printJobId} =
    route.params;
  const resetOrderState = useCartStore((state) => state.resetOrderState);
  const {width} = useWindowDimensions();
  const isWide = width >= 768;

  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const [activePrintJobId, setActivePrintJobId] = useState<string | null>(
    printJobId ?? null,
  );
  const [isReprint, setIsReprint] = useState(Boolean(orderSnapshot.isReprint));
  const [reprinting, setReprinting] = useState(false);

  const effectiveTaxBreakdown = taxBreakdown ?? orderSnapshot.taxBreakdown;
  const isTableSession = orderType === 'table' && Boolean(sessionId);
  const grandTotal =
    Number(orderSnapshot.totalAmount ?? 0) +
    Number(orderSnapshot.tipAmount ?? 0);

  const goToFloor = useCallback(() => {
    resetOrderState();
    navigation.navigate('Floor');
  }, [navigation, resetOrderState]);

  const handleDone = () => {
    if (isTableSession) {
      setReleaseDialogOpen(true);
      return;
    }
    goToFloor();
  };

  const handleReprintBill = async () => {
    const orderId =
      orderSnapshot.orderId ||
      (orderSnapshot as {_id?: string})._id;

    setReprinting(true);
    try {
      if (orderId || activePrintJobId) {
        const res = await reprintTicket({
          orderId: orderId ? String(orderId) : undefined,
          jobId: activePrintJobId ?? undefined,
          printType: 'RECEIPT',
          guestCount: orderSnapshot.guestCount,
          restaurantName: config.APP_NAME.toUpperCase(),
        });

        if (res.success) {
          setIsReprint(true);
          if (res.data?.job?._id) {
            setActivePrintJobId(res.data.job._id);
          }
          toast.success('Receipt reprint queued');
          return;
        }
      }

      // Fallback to direct printerService bill print
      const result = await printerService.printBill(
        {
          order: orderSnapshot,
          taxBreakdown: effectiveTaxBreakdown,
          guestCount: orderSnapshot.guestCount,
          restaurantName: config.APP_NAME.toUpperCase(),
          isReprint: true,
        },
        activePrintJobId ?? undefined,
      );
      if (result.success) {
        setIsReprint(true);
        toast.success('Receipt reprint queued');
      } else {
        toast.error(result.message || 'Failed to queue receipt reprint');
      }
    } catch {
      // Fallback to local printerService
      const result = await printerService.printBill(
        {
          order: orderSnapshot,
          taxBreakdown: effectiveTaxBreakdown,
          guestCount: orderSnapshot.guestCount,
          restaurantName: config.APP_NAME.toUpperCase(),
          isReprint: true,
        },
        activePrintJobId ?? undefined,
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

  const handleReleaseConfirm = async () => {
    setReleaseDialogOpen(false);
    if (sessionId && isPaymentApiConfigured()) {
      setReleasing(true);
      try {
        await releaseTableSession(sessionId);
      } catch (error) {
        Alert.alert(
          'Release failed',
          error instanceof Error
            ? error.message
            : 'Could not release table. You can release from the floor.',
        );
      } finally {
        setReleasing(false);
      }
    }
    goToFloor();
  };

  const handleViewPrintJob = (jobId: string) => {
    navigation.navigate('PrintJobs', {jobId});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PAYMENT COMPLETE</Text>
        <Pressable
          style={styles.closeButton}
          onPress={handleDone}
          accessibilityRole="button"
          accessibilityLabel="Close">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={[styles.body, isWide && styles.bodyWide]}>
        <ScrollView
          style={[styles.previewScroll, isWide && styles.previewScrollWide]}
          contentContainerStyle={styles.previewScrollContent}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          keyboardShouldPersistTaps="handled">
          <ReceiptPreview
            mode="customer"
            order={orderSnapshot}
            taxBreakdown={effectiveTaxBreakdown}
            guestCount={orderSnapshot.guestCount}
            restaurantName={config.APP_NAME.toUpperCase()}
            serverName={
              (orderSnapshot as {serverName?: string; processedByName?: string})
                .serverName ||
              (orderSnapshot as {serverName?: string; processedByName?: string})
                .processedByName
            }
            isReprint={isReprint}
          />
        </ScrollView>

        <ScrollView
          style={[styles.summaryScroll, isWide && styles.summaryScrollWide]}
          contentContainerStyle={styles.summaryScrollContent}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>PAYMENT</Text>
          <Text style={styles.meta}>Order #{orderSnapshot.orderNumber}</Text>
          <Text style={styles.statusPaid}>Paid</Text>
          {orderSnapshot.paymentMethod ? (
            <Text style={styles.meta}>{orderSnapshot.paymentMethod}</Text>
          ) : null}

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>TOTAL PAID</Text>
            <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
          </View>

          <PrintJobStatusStrip
            printJobId={activePrintJobId}
            label="Receipt print job"
            onViewJob={handleViewPrintJob}
          />

          {printMessage ? (
            <Text style={styles.printMessage}>{printMessage}</Text>
          ) : null}

          <Pressable
            style={[styles.primaryAction, reprinting && styles.buttonDisabled]}
            onPress={handleReprintBill}
            disabled={reprinting}
            accessibilityRole="button"
            accessibilityLabel="Reprint bill">
            {reprinting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryActionText}>
                {isReprint ? 'Reprint Bill Again' : 'Reprint Bill'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel="Done">
            {releasing ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <Text style={styles.secondaryActionText}>Done</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={releaseDialogOpen}
        title="Release Table?"
        message={'Payment is complete. Do you want to release this table now?'}
        confirmLabel="Yes, Release"
        cancelLabel="No, Go to Floor"
        onConfirm={handleReleaseConfirm}
        onCancel={() => {
          setReleaseDialogOpen(false);
          goToFloor();
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyWide: {
    flexDirection: 'row',
  },
  previewScroll: {
    flex: 1,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewScrollWide: {
    flex: 1.2,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  previewScrollContent: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  summaryScroll: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  summaryScrollWide: {
    flex: 0.8,
  },
  summaryScrollContent: {
    padding: 24,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statusPaid: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
  },
  totalBlock: {
    marginTop: 16,
    marginBottom: 12,
    gap: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  printMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryAction: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
  reprintAction: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  reprintActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryAction: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
