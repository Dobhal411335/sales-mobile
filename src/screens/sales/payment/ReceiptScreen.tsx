import React, {useCallback, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ConfirmDialog} from '../../../components/common/ConfirmDialog';
import {ReceiptPreview} from '../../../components/payment/ReceiptPreview';
import {colors} from '../../../constants/colors';
import type {SalesStackParamList} from '../../../navigation/types';
import {printerService} from '../../../printer/printerService';
import {useCartStore} from '../../../store/cartStore';
import {formatCurrency} from '../../../utils/currency';

type Props = NativeStackScreenProps<SalesStackParamList, 'Receipt'>;

export function ReceiptScreen({navigation, route}: Props) {
  const {orderSnapshot, sessionId, orderType, taxBreakdown} = route.params;
  const resetOrderState = useCartStore((state) => state.resetOrderState);
  const {width} = useWindowDimensions();
  const isWide = width >= 768;

  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);

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

  const handlePrintBill = async () => {
    await printerService.printBill({
      order: orderSnapshot,
      taxBreakdown,
      guestCount: orderSnapshot.guestCount,
      restaurantName: 'TASTY BITES',
    });
  };

  const handleReleaseConfirm = () => {
    setReleaseDialogOpen(false);
    goToFloor();
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
        <View style={[styles.previewPane, isWide && styles.previewPaneWide]}>
          <ReceiptPreview
            mode="customer"
            order={orderSnapshot}
            taxBreakdown={taxBreakdown}
            guestCount={orderSnapshot.guestCount}
            restaurantName="TASTY BITES"
          />
        </View>

        <View style={[styles.summaryPane, isWide && styles.summaryPaneWide]}>
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

          <Pressable
            style={styles.primaryAction}
            onPress={handlePrintBill}
            accessibilityRole="button"
            accessibilityLabel="Print bill">
            <Text style={styles.primaryActionText}>Print Bill</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel="Done">
            <Text style={styles.secondaryActionText}>Done</Text>
          </Pressable>
        </View>
      </View>

      <ConfirmDialog
        visible={releaseDialogOpen}
        title="Release Table?"
        message={
          'Payment is complete. Do you want to release this table now?'
        }
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
  previewPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewPaneWide: {
    flex: 1.2,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  summaryPane: {
    padding: 24,
    gap: 10,
    backgroundColor: colors.surface,
  },
  summaryPaneWide: {
    flex: 0.8,
    justifyContent: 'center',
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
    marginBottom: 20,
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
