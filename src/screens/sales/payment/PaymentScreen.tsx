import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CardTypeSelector} from '../../../components/payment/CardTypeSelector';
import {DiscountSelectorModal} from '../../../components/payment/DiscountSelectorModal';
import {GiftCardDetailsModal} from '../../../components/payment/GiftCardDetailsModal';
import {PayRemainingActions} from '../../../components/payment/PayRemainingActions';
import {PaymentMethodSelector} from '../../../components/payment/PaymentMethodSelector';
import {PaymentSummary} from '../../../components/payment/PaymentSummary';
import {toast} from '../../../components/common/Toast';
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
import {STAFF_DISCOUNT_CODE, buildStaffDiscountState} from '../../../utils/staffDiscount';
import type {SalesStackParamList} from '../../../navigation/types';
import {useCartStore} from '../../../store/cartStore';
import type {
  AppliedPaymentDiscount,
  CardTypeName,
  DiscountCoupon,
  GiftCardDetails,
  PaymentMethodKey,
  PaymentRequestPayload,
  PaymentUiStatus,
  ServiceTaxConfig,
} from '../../../types/payment';
import {formatCurrency} from '../../../utils/currency';
import {clearDirectOrderId, DIRECT_ORDER_STORAGE_KEYS} from '../../../utils/directOrderStorage';
import {hydrateCartFromOrder} from '../../../utils/orderCartMapper';
import {roundMoney} from '../../../utils/receiptFormat';
import {SERVICE_CHARGE_NO_TIP_MESSAGE} from '../../../utils/serviceCharge';

type Props = NativeStackScreenProps<SalesStackParamList, 'Payment'>;

function mapPaidOrderFromApi(order: ApiOrder) {
  return mapPaymentResponseToSnapshot(order as PaymentApiOrder);
}

export function PaymentScreen({navigation, route}: Props) {
  const params = route.params ?? {};
  const {
    sessionId,
    orderId,
    orderNumber: routeOrderNumber,
    orderType,
    tableId,
    partyName: routePartyName,
    guestCount,
    tableNumber,
    floorName,
    subtotal: routeSubtotal,
    taxTotal: routeTaxTotal,
  } = params;

  const [partyName, setPartyName] = useState(routePartyName || '');
  const items = useCartStore((state) => state.items);
  const cartOrderNumber = useCartStore((state) => state.orderNumber);
  const activeOrderId = useCartStore((state) => state.activeOrderId);
  const markOrderPaid = useCartStore((state) => state.markOrderPaid);
  const hydrateFromOrder = useCartStore((state) => state.hydrateFromOrder);

  const {employees} = useStaffEmployees();

  const displayOrderNumber = routeOrderNumber ?? cartOrderNumber ?? '0000';
  const resolvedOrderId = orderId ?? activeOrderId ?? '';

  const [serviceTax, setServiceTax] = useState<ServiceTaxConfig | null>(null);
  const [availableDiscounts, setAvailableDiscounts] = useState<DiscountCoupon[]>([]);
  const [isStaffOrder, setIsStaffOrder] = useState(orderType === 'staff');
  const [serverSubtotal, setServerSubtotal] = useState(routeSubtotal ?? 0);
  const [serverTaxTotal, setServerTaxTotal] = useState(routeTaxTotal ?? 0);
  const [hydrating, setHydrating] = useState(Boolean(resolvedOrderId));
  const [hydrateError, setHydrateError] = useState('');

  const [giftCardDetails, setGiftCardDetails] = useState<GiftCardDetails | null>(null);
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [isVerifyingGiftCard, setIsVerifyingGiftCard] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

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
            partyName: order.partyName,
            guestName: order.guestName,
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
          if (order.partyName || order.guestName) {
            setPartyName(order.partyName || order.guestName || '');
          }
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
              tax: (item as unknown as {tax?: number}).tax ?? 0,
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
              partyName: match.partyName,
              guestName: match.guestName,
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
            if (match.partyName || match.guestName) {
              setPartyName(match.partyName || match.guestName || '');
            }
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
          setAvailableDiscounts(discounts);
        }
      } else {
        const discounts = await fetchAvailableDiscounts();
        if (!cancelled) {
          setAvailableDiscounts(discounts);
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

  const cashSplitAmount =
    paymentMethod === 'Card' &&
    effectiveCardDue > 0 &&
    cardPayAmount < effectiveCardDue
      ? roundMoney(effectiveCardDue - Math.min(cardPayAmount, effectiveCardDue))
      : 0;

  const cardSplitFromCash =
    paymentMethod === 'Cash' &&
    effectiveCashDue > 0 &&
    Number.isFinite(parsedCashAmount) &&
    cashPayAmount < effectiveCashDue
      ? roundMoney(effectiveCashDue - Math.min(cashPayAmount, effectiveCashDue))
      : 0;

  const remainingAfterGift =
    paymentMethod === 'GiftCard' && giftCardBalance !== null
      ? roundMoney(Math.max(0, totals.totalDue))
      : totals.totalDue;

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
    if (includeServiceCharge && autoTip > 0) {
      return true;
    }
    if (paymentMethod === 'GiftCard' && totals.totalDue > 0) {
      return giftUsedPreview < totals.totalDue;
    }
    if (paymentMethod === 'Card' && cashSplitAmount > 0) {
      return true;
    }
    if (paymentMethod === 'Cash' && cardSplitFromCash > 0) {
      return true;
    }
    const currentCardContribution =
      paymentMethod === 'Card'
        ? Number.isFinite(parsedCardAmount)
          ? Math.min(cardPayAmount, effectiveCardDue)
          : effectiveCardDue
        : lockedCardAmount;
    if (currentCardContribution > 0 && !selectedCardType) {
      return true;
    }
    return false;
  }, [
    hydrating,
    hydrateError,
    paymentStatus,
    includeServiceCharge,
    autoTip,
    paymentMethod,
    totals.totalDue,
    giftUsedPreview,
    cashSplitAmount,
    cardSplitFromCash,
    parsedCardAmount,
    cardPayAmount,
    effectiveCardDue,
    lockedCardAmount,
    selectedCardType,
  ]);

  const handleSelectMethod = (method: PaymentMethodKey) => {
    setLockedCardAmount(0);
    setLockedCashAmount(0);
    setPaymentMethod(method);
    setPaymentStatus('method_selected');
    setStatusMessage('');
  };

  const handleSwitchForRemainder = (
    method: PaymentMethodKey,
    locks?: {lockCard?: number; lockCash?: number},
  ) => {
    if (locks?.lockCard != null) {
      setLockedCardAmount(roundMoney(Math.max(0, locks.lockCard)));
    }
    if (locks?.lockCash != null) {
      setLockedCashAmount(roundMoney(Math.max(0, locks.lockCash)));
    }
    setPaymentMethod(method);
  };

  const handleVerifyGiftCard = async () => {
    if (!giftCardCode.trim()) {
      return;
    }
    setIsVerifyingGiftCard(true);
    setGiftCardError('');
    try {
      const details = await verifyGiftCard(giftCardCode);
      if (!details) {
        setGiftCardError('Gift card not found or cannot be used.');
        setGiftCardBalance(null);
        setGiftCardDetails(null);
        return;
      }
      if (details.balance <= 0) {
        setGiftCardError('Gift card balance is exhausted ($0.00).');
        setGiftCardBalance(null);
        setGiftCardDetails(null);
        return;
      }
      setGiftCardDetails(details);
      setIsGiftCardModalOpen(true);
    } finally {
      setIsVerifyingGiftCard(false);
    }
  };

  const handleApplyGiftCardDetails = (details: GiftCardDetails) => {
    setGiftCardBalance(details.balance);
    const maxApplicable = roundMoney(
      Math.min(details.balance, totals.totalDue),
    );
    setGiftCardUseAmount(String(maxApplicable));
    setIsGiftCardModalOpen(false);
  };

  const handleRemoveGiftCard = () => {
    setGiftCardBalance(null);
    setGiftCardDetails(null);
    setGiftCardCode('');
    setGiftCardError('');
    setGiftCardUseAmount('');
  };

  const handleApplyDiscount = async (codeToApply?: string) => {
    const targetCode = (codeToApply ?? discountCode).trim().toUpperCase();
    if (!targetCode) {
      return;
    }
    if (isStaffOrder) {
      Alert.alert('Staff order', 'Staff discount is applied automatically at payment.');
      return;
    }
    const discount = await applyDiscountCode(targetCode);
    if (!discount) {
      Alert.alert('Invalid code', 'Discount code not found.');
      return;
    }

    const nextTotals = calculatePaymentTotals({
      items,
      subTotal: baseSubtotal,
      taxTotal: baseTaxTotal,
      appliedDiscount: discount,
      includeServiceCharge,
      giftCardUsedAmount: giftUsedPreview,
      serviceTax,
    });

    const oldCardDue = effectiveCardDue;
    const newCardDue = roundMoney(
      Math.max(0, nextTotals.totalDue - lockedCashAmount),
    );
    const oldCashDue = effectiveCashDue;
    const newCashDue = roundMoney(
      Math.max(0, nextTotals.totalDue - lockedCardAmount),
    );
    const discountDiff = roundMoney(totals.totalDue - nextTotals.totalDue);

    if (cardAmountTendered !== '') {
      const parsed = parseFloat(cardAmountTendered);
      if (Number.isFinite(parsed)) {
        if (Math.abs(parsed - oldCardDue) < 0.01 || parsed >= oldCardDue || parsed > newCardDue) {
          setCardAmountTendered(newCardDue.toFixed(2));
        } else {
          const updated = roundMoney(Math.max(0, parsed - discountDiff));
          setCardAmountTendered(Math.min(newCardDue, updated).toFixed(2));
        }
      }
    }

    if (cashAmountTendered !== '') {
      const parsed = parseFloat(cashAmountTendered);
      if (Number.isFinite(parsed)) {
        if (Math.abs(parsed - oldCashDue) < 0.01 || parsed >= oldCashDue || parsed > newCashDue) {
          setCashAmountTendered(newCashDue.toFixed(2));
        } else {
          const updated = roundMoney(Math.max(0, parsed - discountDiff));
          setCashAmountTendered(Math.min(newCashDue, updated).toFixed(2));
        }
      }
    }

    if (giftCardBalance !== null && giftCardUseAmount !== '') {
      const parsedGift = parseFloat(giftCardUseAmount);
      const maxApplicable = roundMoney(
        Math.min(giftCardBalance, nextTotals.totalDue),
      );
      if (Number.isFinite(parsedGift) && parsedGift > maxApplicable) {
        setGiftCardUseAmount(String(maxApplicable));
      }
    }

    setAppliedDiscount(discount);
    setDiscountCode(targetCode);
  };

  const handleRemoveDiscount = () => {
    const nextTotals = calculatePaymentTotals({
      items,
      subTotal: baseSubtotal,
      taxTotal: baseTaxTotal,
      appliedDiscount: null,
      includeServiceCharge,
      giftCardUsedAmount: giftUsedPreview,
      serviceTax,
    });

    const oldCardDue = effectiveCardDue;
    const newCardDue = roundMoney(
      Math.max(0, nextTotals.totalDue - lockedCashAmount),
    );
    const oldCashDue = effectiveCashDue;
    const newCashDue = roundMoney(
      Math.max(0, nextTotals.totalDue - lockedCardAmount),
    );

    if (cardAmountTendered !== '') {
      const parsed = parseFloat(cardAmountTendered);
      if (Number.isFinite(parsed) && Math.abs(parsed - oldCardDue) < 0.01) {
        setCardAmountTendered(newCardDue.toFixed(2));
      }
    }

    if (cashAmountTendered !== '') {
      const parsed = parseFloat(cashAmountTendered);
      if (Number.isFinite(parsed) && Math.abs(parsed - oldCashDue) < 0.01) {
        setCashAmountTendered(newCashDue.toFixed(2));
      }
    }

    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const handleToggleServiceCharge = () => {
    const nextInclude = !includeServiceCharge;
    const nextTotals = calculatePaymentTotals({
      items,
      subTotal: baseSubtotal,
      taxTotal: baseTaxTotal,
      appliedDiscount,
      includeServiceCharge: nextInclude,
      giftCardUsedAmount: giftUsedPreview,
      serviceTax,
    });

    const oldCardDue = effectiveCardDue;
    const newCardDue = roundMoney(
      Math.max(0, nextTotals.totalDue - lockedCashAmount),
    );
    const oldCashDue = effectiveCashDue;
    const newCashDue = roundMoney(
      Math.max(0, nextTotals.totalDue - lockedCardAmount),
    );

    if (cardAmountTendered !== '') {
      const parsed = parseFloat(cardAmountTendered);
      if (Number.isFinite(parsed) && Math.abs(parsed - oldCardDue) < 0.01) {
        setCardAmountTendered(newCardDue.toFixed(2));
      }
    }

    if (cashAmountTendered !== '') {
      const parsed = parseFloat(cashAmountTendered);
      if (Number.isFinite(parsed) && Math.abs(parsed - oldCashDue) < 0.01) {
        setCashAmountTendered(newCashDue.toFixed(2));
      }
    }

    setIncludeServiceCharge(nextInclude);
  };

  const handleCompletePayment = useCallback(async () => {
    if (includeServiceCharge && autoTip > 0) {
      const exactDue =
        paymentMethod === 'Cash' ? effectiveCashDue : effectiveCardDue;
      toast.error(
        `${SERVICE_CHARGE_NO_TIP_MESSAGE} Please enter the exact amount (${formatCurrency(exactDue)}).`,
      );
      return;
    }

    if (completeDisabled) {
      return;
    }

    setPaymentStatus('processing');
    setStatusMessage('Processing payment...');

    let resolvedCashAmount = lockedCashAmount;
    let resolvedCardAmount = lockedCardAmount;
    const parts: string[] = [];

    const giftUsedAmount = giftUsedPreview;
    if (giftUsedAmount > 0) {
      parts.push('Gift Card');
    }

    if (paymentMethod === 'Card') {
      const cardPortion = Number.isFinite(parsedCardAmount)
        ? roundMoney(Math.min(cardPayAmount, effectiveCardDue))
        : roundMoney(effectiveCardDue);
      resolvedCardAmount = roundMoney(lockedCardAmount + cardPortion);
      if (resolvedCardAmount > 0) {
        parts.push(selectedCardType ? `Card - ${selectedCardType}` : 'Card');
      }
      if (lockedCashAmount > 0) {
        parts.push('Cash');
      }
      if (autoTip > 0 && resolvedCardAmount > 0) {
        resolvedCardAmount = roundMoney(resolvedCardAmount + autoTip);
      } else if (autoTip > 0 && lockedCashAmount > 0) {
        resolvedCashAmount = roundMoney(lockedCashAmount + autoTip);
      }
    } else if (paymentMethod === 'Cash') {
      const cashPortion = Number.isFinite(parsedCashAmount)
        ? roundMoney(Math.min(cashPayAmount, effectiveCashDue))
        : roundMoney(effectiveCashDue);
      resolvedCashAmount = roundMoney(lockedCashAmount + cashPortion);
      if (resolvedCashAmount > 0 || giftUsedAmount <= 0) {
        parts.push('Cash');
      }
      if (lockedCardAmount > 0) {
        parts.push(selectedCardType ? `Card - ${selectedCardType}` : 'Card');
      }
      if (autoTip > 0) {
        resolvedCashAmount = roundMoney(resolvedCashAmount + autoTip);
      }
    } else if (paymentMethod === 'GiftCard') {
      if (lockedCardAmount > 0) {
        parts.push(selectedCardType ? `Card - ${selectedCardType}` : 'Card');
      }
      if (lockedCashAmount > 0) {
        parts.push('Cash');
      }
      if (remainingAfterGift > 0) {
        resolvedCashAmount = roundMoney(lockedCashAmount + remainingAfterGift + autoTip);
        if (!parts.includes('Cash')) {
          parts.push('Cash');
        }
      } else if (autoTip > 0) {
        if (lockedCashAmount > 0) {
          resolvedCashAmount = roundMoney(lockedCashAmount + autoTip);
        } else if (lockedCardAmount > 0) {
          resolvedCardAmount = roundMoney(lockedCardAmount + autoTip);
        } else {
          resolvedCashAmount = autoTip;
          parts.push('Cash');
        }
      }
    }

    const resolvedPaymentMethod =
      parts.length > 0 ? parts.join(' + ') : paymentMethod;

    const serverAmount = roundMoney(
      totals.subTotal -
        totals.discountTotal +
        totals.taxTotal +
        totals.serviceChargeTotal,
    );

    const payableTotalWithTip = roundMoney(serverAmount + autoTip);
    if (resolvedCardAmount > 0) {
      const maxCard = roundMoney(
        Math.max(
          0,
          payableTotalWithTip - resolvedCashAmount - giftUsedAmount,
        ),
      );
      resolvedCardAmount = Math.min(resolvedCardAmount, maxCard);
    }

    const finalTip = includeServiceCharge ? 0 : autoTip;
    const finalTipMethod = finalTip > 0 ? (tipMethod ?? null) : null;

    const payload: PaymentRequestPayload = {
      orderId: resolvedOrderId,
      amount: serverAmount,
      method: resolvedPaymentMethod,
      sessionId,
      tipAmount: finalTip,
      tipMethod: finalTipMethod,
      discountTotal: totals.discountTotal,
      discountCode: appliedDiscount?.code ?? null,
      discountPercent:
        appliedDiscount?.type === 'percent'
          ? appliedDiscount.value
          : totals.subTotal > 0 && totals.discountTotal > 0
            ? Math.round((totals.discountTotal / totals.subTotal) * 1000) / 10
            : null,
      guestName: partyName.trim() || undefined,
      partyName: partyName.trim() || undefined,
      guestCount: guestCount != null ? Number(guestCount) : null,
      cashAmount: resolvedCashAmount,
      cardAmount: resolvedCardAmount,
      applyServiceCharge: includeServiceCharge,
      serviceChargeTotal: totals.serviceChargeTotal,
      serviceChargeName: totals.serviceChargeName ?? null,
      cardType: resolvedCardAmount > 0 ? selectedCardType || undefined : undefined,
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
    toast.success('Payment collected successfully!');
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
    effectiveCardDue,
    effectiveCashDue,
    giftCardCode,
    giftUsedPreview,
    guestCount,
    includeServiceCharge,
    items,
    lockedCardAmount,
    lockedCashAmount,
    navigateToReceipt,
    orderType,
    parsedCardAmount,
    parsedCashAmount,
    partyName,
    paymentMethod,
    remainingAfterGift,
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
          {selectedCardType ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CARD AMOUNT</Text>
              <View style={styles.inputWithExactRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={cardAmountTendered}
                  onChangeText={setCardAmountTendered}
                  placeholder={formatCurrency(effectiveCardDue)}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Card amount"
                />
                <Pressable
                  style={styles.exactButton}
                  onPress={() => {
                    setCardAmountTendered(effectiveCardDue.toFixed(2));
                    setCashAmountTendered('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Set exact card amount">
                  <Text style={styles.exactButtonText}>Exact</Text>
                </Pressable>
              </View>
              <Text style={styles.fieldHelper}>
                Enter less than the card due to pay the rest with another method.
              </Text>
              {cardOverpay > 0 && paymentMethod === 'Card' ? (
                includeServiceCharge ? (
                  <View style={styles.serviceChargeErrorBox}>
                    <Text style={styles.serviceChargeErrorText}>
                      {SERVICE_CHARGE_NO_TIP_MESSAGE} Please enter the exact amount ({formatCurrency(effectiveCardDue)}) to complete payment.
                    </Text>
                    <Pressable
                      style={styles.setExactButton}
                      onPress={() => {
                        setCardAmountTendered(effectiveCardDue.toFixed(2));
                        setCashAmountTendered('');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Set exact card amount">
                      <Text style={styles.setExactButtonText}>
                        Set Exact ({formatCurrency(effectiveCardDue)})
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.tipNote}>
                    Overpay treated as tip: {formatCurrency(cardOverpay)}
                  </Text>
                )
              ) : null}
            </View>
          ) : null}

          {selectedCardType && cashSplitAmount > 0 ? (
            <PayRemainingActions
              remaining={cashSplitAmount}
              currentMethod="Card"
              onSwitch={(nextMethod) => {
                const cardPortion = roundMoney(
                  Math.min(cardPayAmount, effectiveCardDue),
                );
                if (nextMethod === 'Cash') {
                  setCashAmountTendered(cashSplitAmount.toFixed(2));
                }
                handleSwitchForRemainder(nextMethod, {lockCard: cardPortion});
              }}
            />
          ) : null}
        </View>
      ) : null}

      {paymentMethod === 'Cash' ? (
        <View style={styles.methodSection}>
          <Text style={styles.methodHeading}>CASH PAYMENT</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CASH RECEIVED</Text>
            <View style={styles.inputWithExactRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={cashAmountTendered}
                onChangeText={setCashAmountTendered}
                placeholder={formatCurrency(effectiveCashDue)}
                keyboardType="decimal-pad"
                accessibilityLabel="Cash amount"
              />
              <Pressable
                style={styles.exactButton}
                onPress={() => {
                  setCashAmountTendered(effectiveCashDue.toFixed(2));
                }}
                accessibilityRole="button"
                accessibilityLabel="Set exact cash amount">
                <Text style={styles.exactButtonText}>Exact</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldHelper}>
              Enter less than the due amount to pay the rest with another method.
            </Text>
            {cashOverpay > 0 && paymentMethod === 'Cash' ? (
              includeServiceCharge ? (
                <View style={styles.serviceChargeErrorBox}>
                  <Text style={styles.serviceChargeErrorText}>
                    {SERVICE_CHARGE_NO_TIP_MESSAGE} Please enter the exact amount ({formatCurrency(effectiveCashDue)}) to complete payment.
                  </Text>
                  <Pressable
                    style={styles.setExactButton}
                    onPress={() => {
                      setCashAmountTendered(effectiveCashDue.toFixed(2));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Set exact cash amount">
                    <Text style={styles.setExactButtonText}>
                      Set Exact ({formatCurrency(effectiveCashDue)})
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.tipNote}>
                  Overpay treated as tip: {formatCurrency(cashOverpay)}
                </Text>
              )
            ) : null}
          </View>

          {cardSplitFromCash > 0 ? (
            <PayRemainingActions
              remaining={cardSplitFromCash}
              currentMethod="Cash"
              onSwitch={(nextMethod) => {
                const cashPortion = roundMoney(
                  Math.min(cashPayAmount, effectiveCashDue),
                );
                if (nextMethod === 'Card') {
                  setCardAmountTendered(cardSplitFromCash.toFixed(2));
                  setSelectedCardType('');
                }
                handleSwitchForRemainder(nextMethod, {lockCash: cashPortion});
              }}
            />
          ) : null}
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
                disabled={isVerifyingGiftCard}
                accessibilityRole="button"
                accessibilityLabel="Verify gift card">
                {isVerifyingGiftCard ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.verifyText}>Verify</Text>
                )}
              </Pressable>
            </View>
            {giftCardError ? (
              <Text style={styles.errorText}>{giftCardError}</Text>
            ) : null}
            {giftCardBalance !== null ? (
              <View style={styles.giftCardBadgeRow}>
                <Text style={styles.balanceText}>
                  Balance: {formatCurrency(giftCardBalance)}
                </Text>
                <Pressable onPress={handleRemoveGiftCard}>
                  <Text style={styles.removeTextSmall}>Remove</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {giftCardBalance !== null ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>AMOUNT TO APPLY</Text>
              <View style={styles.inputWithExactRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={giftCardUseAmount}
                  onChangeText={setGiftCardUseAmount}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Gift card amount"
                />
                <Pressable
                  style={styles.exactButton}
                  onPress={() => {
                    const maxApplicable = roundMoney(
                      Math.min(giftCardBalance, totals.totalDue),
                    );
                    setGiftCardUseAmount(String(maxApplicable));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Use exact gift card amount">
                  <Text style={styles.exactButtonText}>Exact</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {remainingAfterGift > 0 && giftCardBalance !== null ? (
            <PayRemainingActions
              remaining={remainingAfterGift}
              currentMethod="GiftCard"
              onSwitch={(nextMethod) => {
                if (nextMethod === 'Card') {
                  setCardAmountTendered(remainingAfterGift.toFixed(2));
                  setSelectedCardType('');
                } else if (nextMethod === 'Cash') {
                  setCashAmountTendered(remainingAfterGift.toFixed(2));
                }
                setPaymentMethod(nextMethod);
              }}
            />
          ) : null}
        </View>
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
            onChangePartyName={setPartyName}
            items={items}
            subtotal={totals.subTotal}
            taxTotal={totals.taxTotal}
            discountTotal={totals.discountTotal}
            discountLabel={
              appliedDiscount?.type === 'percent'
                ? `Discount (${appliedDiscount.value}%)`
                : totals.subTotal > 0 && totals.discountTotal > 0
                  ? `Discount (${Math.round((totals.discountTotal / totals.subTotal) * 1000) / 10}%)`
                  : 'Discount'
            }
            serviceChargeTotal={totals.serviceChargeTotal}
            serviceChargeName={totals.serviceChargeName}
            includeServiceCharge={includeServiceCharge}
            onToggleServiceCharge={handleToggleServiceCharge}
            serviceTax={serviceTax}
            giftCardUsed={giftUsedPreview}
            totalDue={totals.totalDue}
            tipAmount={includeServiceCharge ? 0 : autoTip}
            lockedCardAmount={lockedCardAmount}
            lockedCashAmount={lockedCashAmount}
            selectedCardType={selectedCardType || undefined}
            availableDiscounts={availableDiscounts}
            appliedDiscount={appliedDiscount}
            discountCode={discountCode}
            onChangeDiscountCode={(val) => setDiscountCode(val.toUpperCase())}
            onApplyDiscount={handleApplyDiscount}
            onRemoveDiscount={handleRemoveDiscount}
            onOpenDiscountSelector={() => setIsDiscountModalOpen(true)}
            isStaffOrder={isStaffOrder}
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
          {paymentStatus === 'processing' ? (
            <View style={styles.completeLoadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.completeText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.completeText}>Complete Payment</Text>
          )}
        </Pressable>
      </View>

      <GiftCardDetailsModal
        visible={isGiftCardModalOpen}
        details={giftCardDetails}
        onClose={() => setIsGiftCardModalOpen(false)}
        onApply={handleApplyGiftCardDetails}
      />

      <DiscountSelectorModal
        visible={isDiscountModalOpen}
        discounts={availableDiscounts}
        onClose={() => setIsDiscountModalOpen(false)}
        onSelect={(code) => handleApplyDiscount(code)}
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
  inputWithExactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputFlex: {
    flex: 1,
  },
  exactButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exactButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fieldHelper: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tipNote: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  serviceChargeErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    gap: 8,
  },
  serviceChargeErrorText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    lineHeight: 18,
  },
  setExactButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  setExactButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  giftRow: {
    flexDirection: 'row',
    gap: 8,
  },
  giftInput: {
    flex: 1,
  },
  giftCardBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
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
  discountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectDiscountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  selectDiscountBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  appliedDiscount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  appliedDiscountInfo: {
    gap: 2,
  },
  appliedDiscountCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  appliedDiscountSavings: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  removeDiscountButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeText: {
    fontSize: 13,
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
  completeLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
