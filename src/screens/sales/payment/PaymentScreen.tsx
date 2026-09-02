import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CardTypeSelector} from '../../../components/payment/CardTypeSelector';
import {PaymentMethodSelector} from '../../../components/payment/PaymentMethodSelector';
import {PaymentSummary} from '../../../components/payment/PaymentSummary';
import {colors} from '../../../constants/colors';
import {
  applyDiscountCode,
  calculatePaymentTotals,
  fetchActiveServiceTax,
  fetchAvailableDiscounts,
  fetchPaymentRecoveryState,
  isPaymentApiConfigured,
  mapPaymentResponseToSnapshot,
  processPayment,
  verifyGiftCard,
} from '../../../services/paymentService';
import {fetchOrderById} from '../../../services/orderService';
import {fetchTodayOrders} from '../../../services/todayOrdersService';
import {useStaffEmployees, getStaffEmployeeName} from '../../../hooks/useStaffEmployees';
import type {PaymentApiOrder} from '../../../types/payment';
import type {TaxBreakdownLine} from '../../../types/receipt';
import type {ApiOrder} from '../../../types/order';
import {formatServiceTaxRate} from '../../../utils/serviceCharge';
import {STAFF_DISCOUNT_CODE, buildStaffDiscountState} from '../../../utils/staffDiscount';
import type {SalesStackParamList} from '../../../navigation/types';
import {useCartStore} from '../../../store/cartStore';
import type {
  AppliedPaymentDiscount,
  CardTypeName,
  PaymentMethodKey,
  PaymentUiStatus,
  ServiceTaxConfig,
} from '../../../types/payment';
import {formatCurrency} from '../../../utils/currency';
import {clearDirectOrderId, DIRECT_ORDER_STORAGE_KEYS} from '../../../utils/directOrderStorage';
import {hydrateCartFromOrder} from '../../../utils/orderCartMapper';
import {roundMoney} from '../../../utils/receiptFormat';

type Props = NativeStackScreenProps<SalesStackParamList, 'Payment'>;

function mapPaidOrderFromApi(order: ApiOrder) {
  return mapPaymentResponseToSnapshot(order as PaymentApiOrder);
}

function buildPaymentMethodLabel(
  method: PaymentMethodKey,
  cardType?: CardTypeName | '',
  hasGift?: boolean,
  hasCash?: boolean,
  hasCard?: boolean,
): string {
  const parts: string[] = [];
  if (hasGift) {
    parts.push('Gift Card');
  }
  if (hasCard) {
    parts.push(cardType ? `Card - ${cardType}` : 'Card');
  }
  if (hasCash) {
    parts.push('Cash');
  }
  if (parts.length === 0) {
    if (method === 'GiftCard') {
      return 'Gift Card';
    }
    if (method === 'Cash') {
      return 'Cash';
    }
    return cardType ? `Card - ${cardType}` : 'Card';
  }
  return parts.join(' + ');
}

export function PaymentScreen({navigation, route}: Props) {
  const params = route.params ?? {};
  const {
    sessionId,
    orderId,
    orderNumber: routeOrderNumber,
    orderType,
    tableId,
    partyName,
    guestCount,
    tableNumber,
    floorName,
    subtotal: routeSubtotal,
    taxTotal: routeTaxTotal,
  } = params;

  const items = useCartStore((state) => state.items);
  const cartOrderNumber = useCartStore((state) => state.orderNumber);
  const activeOrderId = useCartStore((state) => state.activeOrderId);
  const markOrderPaid = useCartStore((state) => state.markOrderPaid);
  const hydrateFromOrder = useCartStore((state) => state.hydrateFromOrder);

  const {employees} = useStaffEmployees();

  const displayOrderNumber = routeOrderNumber ?? cartOrderNumber ?? '0000';
  const resolvedOrderId = orderId ?? activeOrderId ?? '';

  const [serviceTax, setServiceTax] = useState<ServiceTaxConfig | null>(null);
  const [availableDiscounts, setAvailableDiscounts] = useState<string[]>([]);
  const [isStaffOrder, setIsStaffOrder] = useState(orderType === 'staff');
  const [serverSubtotal, setServerSubtotal] = useState(routeSubtotal ?? 0);
  const [serverTaxTotal, setServerTaxTotal] = useState(routeTaxTotal ?? 0);
  const [hydrating, setHydrating] = useState(Boolean(resolvedOrderId));
  const [hydrateError, setHydrateError] = useState('');

  const navigateToReceipt = useCallback(
    (
      order: NonNullable<Awaited<ReturnType<typeof processPayment>>['order']>,
      receiptPrintJobId?: string | null,
      receiptTaxBreakdown?: TaxBreakdownLine[],
    ) => {
      markOrderPaid(order);
      navigation.replace('Receipt', {
        orderSnapshot: order,
        sessionId,
        orderType,
        tableId,
        taxBreakdown: receiptTaxBreakdown ?? order.taxBreakdown,
        printJobId: receiptPrintJobId ?? undefined,
      });
    },
    [markOrderPaid, navigation, orderType, sessionId, tableId],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateOrder = async () => {
      if (!resolvedOrderId) {
        setHydrating(false);
        setHydrateError('No order found. Send KOT or select an order first.');
        return;
      }

      setHydrating(true);
      setHydrateError('');

      try {
        if (isPaymentApiConfigured()) {
          const order = await fetchOrderById(resolvedOrderId);
          if (cancelled) {
            return;
          }

          if (!order) {
            const recovery = await fetchPaymentRecoveryState(resolvedOrderId);
            if (cancelled) {
              return;
            }
            if (recovery.paid && recovery.order) {
              navigateToReceipt(recovery.order, recovery.printJobId);
              return;
            }
            setHydrateError('Order not found or cannot be paid.');
            setHydrating(false);
            return;
          }

          if (
            String(order.paymentStatus ?? '').toUpperCase() === 'PAID' ||
            String(order.status ?? '').toUpperCase() === 'PAID'
          ) {
            const paidSnapshot = mapPaidOrderFromApi(order);
            navigateToReceipt(paidSnapshot);
            return;
          }

          const hydrated = hydrateCartFromOrder(order);
          hydrateFromOrder({
            items: hydrated.items,
            orderNumber: order.orderNumber,
            orderId: order._id,
            orderStatus: order.status,
            orderNote: order.specialNote,
            partyName: order.partyName ?? order.guestName,
            guestName: order.guestName ?? order.partyName,
            guestPhone: order.contactNumber ?? '',
            guestCountryCode: order.guestCountryCode ?? '+1',
            guestEmail: order.guestEmail ?? '',
            hasSentKot: hydrated.hasSentKot,
            kotCartFingerprint: hydrated.kotCartFingerprint,
            persistedTotals: hydrated.persistedTotals,
            appliedDiscount: hydrated.appliedDiscount,
            serverName: order.processedByName,
          });

          setServerSubtotal(order.subTotal);
          setServerTaxTotal(order.taxTotal);
          setIsStaffOrder(order.source === 'STAFF');
          if (order.source === 'STAFF' && order.staffFor) {
            const emp = employees.find((e) => e.id === String(order.staffFor));
            const staffDiscount = buildStaffDiscountState(
              emp?.staffDiscount ?? 0,
              emp?.name ?? getStaffEmployeeName(employees, String(order.staffFor)),
            );
            if (staffDiscount) {
              setAppliedDiscount({
                code: STAFF_DISCOUNT_CODE,
                type: 'percent',
                value: staffDiscount.value,
              });
            }
          }
        } else {
          const today = await fetchTodayOrders();
          if (cancelled) {
            return;
          }
          const match = today.data?.find((row) => row._id === resolvedOrderId);
          if (match?.items?.length) {
            const cartItems = match.items.map((item, idx) => ({
              id: `mock-${idx}`,
              cartId: `mock-${idx}`,
              name: item.name,
              productCode: '',
              category: 'ITEMS',
              price: item.price,
              tax: 0,
              serviceCharge: 0,
              qty: item.qty,
              size: item.size,
              modifier: item.preparationStyle,
            }));
            hydrateFromOrder({
              items: cartItems,
              orderNumber: match.orderNumber,
              orderId: match._id,
              orderStatus: match.status,
              partyName: match.partyName ?? match.guestName,
              guestName: match.guestName ?? match.partyName,
              hasSentKot: true,
              kotCartFingerprint: null,
              persistedTotals: {
                subtotal: match.subTotal ?? 0,
                taxTotal: match.taxTotal ?? 0,
                discountTotal: match.discountTotal ?? 0,
                total: match.totalAmount,
              },
              appliedDiscount: null,
            });
            setServerSubtotal(match.subTotal ?? 0);
            setServerTaxTotal(match.taxTotal ?? 0);
          }
        }
      } catch {
        if (!cancelled) {
          setHydrateError('Unable to load order. Check your connection.');
        }
      } finally {
        if (!cancelled) {
          setHydrating(false);
        }
      }
    };

    hydrateOrder();
    return () => {
      cancelled = true;
    };
  }, [resolvedOrderId, employees, hydrateFromOrder, navigateToReceipt]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const tax = await fetchActiveServiceTax();
      if (!cancelled) {
        setServiceTax(tax);
      }

      if (isPaymentApiConfigured()) {
        const discounts = await fetchAvailableDiscounts();
        if (!cancelled) {
          setAvailableDiscounts(discounts.map((d) => d.code));
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const {width} = useWindowDimensions();
  const isWide = width >= 768;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('Card');
  const [selectedCardType, setSelectedCardType] = useState<CardTypeName | ''>(
    '',
  );
  const [cardAmountTendered, setCardAmountTendered] = useState('');
  const [cashAmountTendered, setCashAmountTendered] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardUseAmount, setGiftCardUseAmount] = useState('');
  const [giftCardError, setGiftCardError] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] =
    useState<AppliedPaymentDiscount | null>(null);
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  const [lockedCardAmount, setLockedCardAmount] = useState(0);
  const [lockedCashAmount, setLockedCashAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentUiStatus>('default');
  const [statusMessage, setStatusMessage] = useState('');

  const baseSubtotal = serverSubtotal;
  const baseTaxTotal = serverTaxTotal;

  const giftUsedPreview = useMemo(() => {
    if (giftCardBalance === null) {
      return 0;
    }
    const parsed = parseFloat(giftCardUseAmount);
    const requested = Number.isFinite(parsed) ? parsed : giftCardBalance;
    return roundMoney(
      Math.min(requested, giftCardBalance, baseSubtotal + baseTaxTotal),
    );
  }, [giftCardBalance, giftCardUseAmount, baseSubtotal, baseTaxTotal]);

  const totals = useMemo(
    () =>
      calculatePaymentTotals({
        items,
        subTotal: baseSubtotal,
        taxTotal: baseTaxTotal,
        appliedDiscount,
        includeServiceCharge,
        giftCardUsedAmount: giftUsedPreview,
        serviceTax,
      }),
    [
      items,
      baseSubtotal,
      baseTaxTotal,
      appliedDiscount,
      includeServiceCharge,
      giftUsedPreview,
      serviceTax,
    ],
  );

  const effectiveCardDue = roundMoney(
    Math.max(0, totals.totalDue - lockedCashAmount),
  );
  const effectiveCashDue = roundMoney(
    Math.max(0, totals.totalDue - lockedCardAmount),
  );

  const parsedCardAmount =
    cardAmountTendered === '' ? NaN : parseFloat(cardAmountTendered);
  const cardPayAmount = Number.isFinite(parsedCardAmount)
    ? Math.max(0, parsedCardAmount)
    : effectiveCardDue;

  const parsedCashAmount =
    cashAmountTendered === '' ? NaN : parseFloat(cashAmountTendered);
  const cashPayAmount = Number.isFinite(parsedCashAmount)
    ? Math.max(0, parsedCashAmount)
    : effectiveCashDue;

  const cardOverpay =
    paymentMethod === 'Card' &&
    Number.isFinite(parsedCardAmount) &&
    cardPayAmount > effectiveCardDue
      ? roundMoney(cardPayAmount - effectiveCardDue)
      : 0;

  const cashOverpay =
    paymentMethod === 'Cash' &&
    Number.isFinite(parsedCashAmount) &&
    cashPayAmount > effectiveCashDue
      ? roundMoney(cashPayAmount - effectiveCashDue)
      : 0;

  const autoTip = roundMoney(cardOverpay || cashOverpay || 0);
  const tipMethod = cashOverpay > 0 ? 'Cash' : cardOverpay > 0 ? 'Card' : null;

  const completeDisabled = useMemo(() => {
    if (hydrating || hydrateError) {
      return true;
    }
    if (paymentStatus === 'processing') {
      return true;
    }
    if (paymentMethod === 'GiftCard' && totals.totalDue > 0) {
      return giftUsedPreview < totals.totalDue;
    }
    if (paymentMethod === 'Card' && cardPayAmount > 0 && !selectedCardType) {
      return true;
    }
    return false;
  }, [
    paymentStatus,
    paymentMethod,
    totals.totalDue,
    giftUsedPreview,
    cardPayAmount,
    selectedCardType,
    hydrating,
    hydrateError,
  ]);

  const handleSelectMethod = (method: PaymentMethodKey) => {
    setLockedCardAmount(0);
    setLockedCashAmount(0);
    setPaymentMethod(method);
    setPaymentStatus('method_selected');
    setStatusMessage('');
  };

  const handleVerifyGiftCard = async () => {
    setGiftCardError('');
    const details = await verifyGiftCard(giftCardCode);
    if (!details) {
      setGiftCardError('Gift card not found or cannot be used.');
      setGiftCardBalance(null);
      return;
    }
    setGiftCardBalance(details.balance);
    setGiftCardUseAmount(String(Math.min(details.balance, totals.totalDue)));
  };

  const handleApplyDiscount = async () => {
    if (isStaffOrder) {
      Alert.alert('Staff order', 'Staff discount is applied automatically at payment.');
      return;
    }
    const discount = await applyDiscountCode(discountCode);
    if (!discount) {
      Alert.alert('Invalid code', 'Discount code not found.');
      return;
    }
    setAppliedDiscount(discount);
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const handleCompletePayment = useCallback(async () => {
    if (completeDisabled) {
      return;
    }

    setPaymentStatus('processing');
    setStatusMessage('Processing payment...');

    const hasGift = giftUsedPreview > 0;
    const hasCard =
      paymentMethod === 'Card' ||
      (lockedCardAmount > 0 || cardPayAmount > 0);
    const hasCash =
      paymentMethod === 'Cash' ||
      (lockedCashAmount > 0 || cashPayAmount > 0);

    const paymentMethodLabel = buildPaymentMethodLabel(
      paymentMethod,
      selectedCardType,
      hasGift,
      hasCash && paymentMethod === 'Cash' || cashPayAmount > 0,
      hasCard && (paymentMethod === 'Card' || cardPayAmount > 0),
    );

    const serverAmount = roundMoney(
      totals.subTotal -
        totals.discountTotal +
        totals.taxTotal +
        totals.serviceChargeTotal,
    );

    const payload = {
      orderId: resolvedOrderId,
      amount: serverAmount,
      method: paymentMethodLabel,
      sessionId,
      tipAmount: autoTip,
      tipMethod: tipMethod ?? null,
      discountTotal: totals.discountTotal,
      discountCode: appliedDiscount?.code ?? null,
      guestName: partyName,
      partyName,
      guestCount: guestCount ?? null,
      cashAmount:
        paymentMethod === 'Cash' || cashPayAmount > 0
          ? cashPayAmount + lockedCashAmount
          : 0,
      cardAmount:
        paymentMethod === 'Card' || cardPayAmount > 0
          ? cardPayAmount + lockedCardAmount
          : 0,
      applyServiceCharge: includeServiceCharge,
      serviceChargeTotal: totals.serviceChargeTotal,
      serviceChargeName: totals.serviceChargeName ?? null,
      cardType: selectedCardType || undefined,
      giftCardCode:
        giftUsedPreview > 0 ? giftCardCode.trim().toUpperCase() : undefined,
      giftCardUsedAmount: giftUsedPreview > 0 ? giftUsedPreview : undefined,
      splitAmount:
        giftUsedPreview > 0
          ? roundMoney(Math.max(0, serverAmount - giftUsedPreview))
          : undefined,
    };

    const result = await processPayment(payload, items);

    if (!result.success || !result.order) {
      const recovery = await fetchPaymentRecoveryState(resolvedOrderId);
      if (recovery.paid && recovery.order) {
        if (orderType === 'walking') {
          await clearDirectOrderId(DIRECT_ORDER_STORAGE_KEYS.walking);
        } else if (orderType === 'staff') {
          await clearDirectOrderId(DIRECT_ORDER_STORAGE_KEYS.staff);
        }
        navigateToReceipt(recovery.order, recovery.printJobId, recovery.order.taxBreakdown);
        return;
      }

      setPaymentStatus('failed');
      setStatusMessage(
        result.alreadyPaid
          ? 'This order is already paid on the server.'
          : result.message ?? 'Payment could not be completed. Try again.',
      );
      return;
    }

    if (orderType === 'walking') {
      await clearDirectOrderId(DIRECT_ORDER_STORAGE_KEYS.walking);
    } else if (orderType === 'staff') {
      await clearDirectOrderId(DIRECT_ORDER_STORAGE_KEYS.staff);
    }

    setPaymentStatus('success');
    navigateToReceipt(
      result.order,
      result.printJobId,
      totals.taxBreakdown,
    );
  }, [
    appliedDiscount,
    autoTip,
    cardPayAmount,
    cashPayAmount,
    completeDisabled,
    giftCardCode,
    giftUsedPreview,
    guestCount,
    includeServiceCharge,
    items,
    lockedCardAmount,
    lockedCashAmount,
    navigateToReceipt,
    orderType,
    partyName,
    paymentMethod,
    resolvedOrderId,
    selectedCardType,
    sessionId,
    tipMethod,
    totals,
  ]);

  const handleCancel = () => {
    setPaymentStatus('cancelled');
    navigation.goBack();
  };

  const paymentControls = (
    <ScrollView
      style={styles.controlsScroll}
      contentContainerStyle={styles.controlsContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <Text style={styles.controlsTitle}>PAYMENT METHOD</Text>
      <PaymentMethodSelector
        selected={paymentMethod}
        onSelect={handleSelectMethod}
      />

      {paymentMethod === 'Card' ? (
        <View style={styles.methodSection}>
          <Text style={styles.methodHeading}>CARD PAYMENT</Text>
          <CardTypeSelector
            selected={selectedCardType}
            onSelect={setSelectedCardType}
          />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CARD AMOUNT</Text>
            <TextInput
              style={styles.input}
              value={cardAmountTendered}
              onChangeText={setCardAmountTendered}
              placeholder={formatCurrency(effectiveCardDue)}
              keyboardType="decimal-pad"
              accessibilityLabel="Card amount"
            />
            {autoTip > 0 && paymentMethod === 'Card' ? (
              <Text style={styles.tipNote}>
                Overpay treated as tip: {formatCurrency(autoTip)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {paymentMethod === 'Cash' ? (
        <View style={styles.methodSection}>
          <Text style={styles.methodHeading}>CASH PAYMENT</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CASH RECEIVED</Text>
            <TextInput
              style={styles.input}
              value={cashAmountTendered}
              onChangeText={setCashAmountTendered}
              placeholder={formatCurrency(effectiveCashDue)}
              keyboardType="decimal-pad"
              accessibilityLabel="Cash amount"
            />
            {autoTip > 0 && paymentMethod === 'Cash' ? (
              <Text style={styles.tipNote}>
                Overpay treated as tip: {formatCurrency(autoTip)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {paymentMethod === 'GiftCard' ? (
        <View style={styles.methodSection}>
          <Text style={styles.methodHeading}>GIFT CARD</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>GIFT CARD CODE</Text>
            <View style={styles.giftRow}>
              <TextInput
                style={[styles.input, styles.giftInput]}
                value={giftCardCode}
                onChangeText={setGiftCardCode}
                placeholder="Enter code"
                autoCapitalize="characters"
                accessibilityLabel="Gift card code"
              />
              <Pressable
                style={styles.verifyButton}
                onPress={handleVerifyGiftCard}
                accessibilityRole="button"
                accessibilityLabel="Verify gift card">
                <Text style={styles.verifyText}>Verify</Text>
              </Pressable>
            </View>
            {giftCardError ? (
              <Text style={styles.errorText}>{giftCardError}</Text>
            ) : null}
            {giftCardBalance !== null ? (
              <Text style={styles.balanceText}>
                Balance: {formatCurrency(giftCardBalance)}
              </Text>
            ) : null}
          </View>
          {giftCardBalance !== null ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>AMOUNT TO APPLY</Text>
              <TextInput
                style={styles.input}
                value={giftCardUseAmount}
                onChangeText={setGiftCardUseAmount}
                keyboardType="decimal-pad"
                accessibilityLabel="Gift card amount"
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.discountSection}>
        <Text style={styles.methodHeading}>DISCOUNT</Text>
        {appliedDiscount ? (
          <View style={styles.appliedDiscount}>
            <Text style={styles.appliedDiscountText}>
              Applied: {appliedDiscount.code}
            </Text>
            <Pressable onPress={handleRemoveDiscount}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.giftRow}>
              <TextInput
                style={[styles.input, styles.giftInput]}
                value={discountCode}
                onChangeText={setDiscountCode}
                placeholder="Discount code"
                autoCapitalize="characters"
                accessibilityLabel="Discount code"
              />
              <Pressable
                style={styles.verifyButton}
                onPress={handleApplyDiscount}
                accessibilityRole="button"
                accessibilityLabel="Apply discount">
                <Text style={styles.verifyText}>Apply</Text>
              </Pressable>
            </View>
            <Text style={styles.hintText}>
              {isPaymentApiConfigured() && availableDiscounts.length > 0
                ? `Available: ${availableDiscounts.slice(0, 5).join(', ')}`
                : !isPaymentApiConfigured()
                  ? 'Offline discount codes available in dev mode.'
                  : ''}
            </Text>
          </>
        )}
      </View>

      {serviceTax ? (
        <Pressable
          style={styles.serviceChargeRow}
          onPress={() => setIncludeServiceCharge((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{checked: includeServiceCharge}}>
          <View
            style={[
              styles.checkbox,
              includeServiceCharge && styles.checkboxChecked,
            ]}>
            {includeServiceCharge ? (
              <Text style={styles.checkboxMark}>✓</Text>
            ) : null}
          </View>
          <Text style={styles.serviceChargeText}>
            Add {serviceTax.name} ({formatServiceTaxRate(serviceTax)})
          </Text>
        </Pressable>
      ) : null}

      {statusMessage ? (
        <View
          style={[
            styles.statusBanner,
            paymentStatus === 'failed' && styles.statusFailed,
            paymentStatus === 'processing' && styles.statusProcessing,
          ]}>
          {paymentStatus === 'processing' ? (
            <ActivityIndicator color={colors.primary} />
          ) : null}
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PAYMENT</Text>
        <Pressable
          style={styles.closeButton}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Close payment">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={[styles.body, isWide && styles.bodyWide]}>
        {hydrating ? (
          <View style={styles.hydrateLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.hydrateText}>Loading order...</Text>
          </View>
        ) : hydrateError ? (
          <View style={styles.hydrateLoading}>
            <Text style={styles.hydrateError}>{hydrateError}</Text>
          </View>
        ) : (
          <>
        <View style={[styles.summaryPane, isWide && styles.summaryPaneWide]}>
          <PaymentSummary
            orderNumber={displayOrderNumber}
            tableNumber={tableNumber}
            floorName={floorName}
            guestCount={guestCount}
            partyName={partyName}
            items={items}
            subtotal={totals.subTotal}
            taxTotal={totals.taxTotal}
            discountTotal={totals.discountTotal}
            serviceChargeTotal={totals.serviceChargeTotal}
            serviceChargeName={totals.serviceChargeName}
            giftCardUsed={giftUsedPreview}
            totalDue={totals.totalDue}
            tipAmount={autoTip}
          />
        </View>

        <View style={[styles.controlsPane, isWide && styles.controlsPaneWide]}>
          {paymentControls}
        </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.cancelButton}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel payment">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[
            styles.completeButton,
            completeDisabled && styles.completeDisabled,
          ]}
          onPress={handleCompletePayment}
          disabled={completeDisabled}
          accessibilityRole="button"
          accessibilityLabel="Complete payment">
          <Text style={styles.completeText}>
            {paymentStatus === 'processing' ? 'Processing...' : 'Complete Payment'}
          </Text>
        </Pressable>
      </View>
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
  hydrateLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  hydrateText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  hydrateError: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
    textAlign: 'center',
  },
  summaryPane: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryPaneWide: {
    flex: 1.1,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  controlsPane: {
    flex: 1,
    backgroundColor: colors.background,
  },
  controlsPaneWide: {
    flex: 0.9,
  },
  controlsScroll: {
    flex: 1,
  },
  controlsContent: {
    padding: 20,
    gap: 16,
  },
  controlsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  methodSection: {
    gap: 12,
  },
  methodHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  tipNote: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  giftRow: {
    flexDirection: 'row',
    gap: 8,
  },
  giftInput: {
    flex: 1,
  },
  verifyButton: {
    minHeight: 48,
    minWidth: 88,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  verifyText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.surface,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  discountSection: {
    gap: 8,
  },
  appliedDiscount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  appliedDiscountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  serviceChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.cream,
  },
  checkboxMark: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  serviceChargeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFailed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statusProcessing: {
    backgroundColor: colors.cream,
    borderColor: colors.primaryLight,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
  completeButton: {
    flex: 1.4,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeDisabled: {
    opacity: 0.5,
  },
  completeText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
});
