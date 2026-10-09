import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Percent,
  User,
} from 'lucide-react-native';
import {CardTypeSelector} from '../../../components/payment/CardTypeSelector';
import {DiscountSelectorModal} from '../../../components/payment/DiscountSelectorModal';
import {GiftCardDetailsModal} from '../../../components/payment/GiftCardDetailsModal';
import {PayRemainingActions} from '../../../components/payment/PayRemainingActions';
import {PaymentHistoryPanel} from '../../../components/payment/PaymentHistoryPanel';
import {PaymentMethodSelector} from '../../../components/payment/PaymentMethodSelector';
import {ReceiptPreview} from '../../../components/payment/ReceiptPreview';
import {
  createDefaultSplitRows,
  SplitBillEditor,
  type SplitMode,
} from '../../../components/payment/SplitBillEditor';
import {NetworkErrorState} from '../../../components/common/NetworkErrorState';
import {toast} from '../../../components/common/Toast';
import {PaymentPageSkeleton} from '../../../components/payment/PaymentPageSkeleton';
import {colors} from '../../../constants/colors';
import {config} from '../../../constants/config';
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
import {fetchOrderById, fetchOrderBySession} from '../../../services/orderService';
import {fetchTodayOrders} from '../../../services/todayOrdersService';
import {useStaffEmployees, getStaffEmployeeName} from '../../../hooks/useStaffEmployees';
import type {PaymentApiOrder} from '../../../types/payment';
import type {TaxBreakdownLine} from '../../../types/receipt';
import type {ApiOrder, ApiOrderItem} from '../../../types/order';
import {buildCartFromOrderItems} from '../../../utils/orderCartMapper';
import {STAFF_DISCOUNT_CODE, buildStaffDiscountState} from '../../../utils/staffDiscount';
import type {SalesStackParamList} from '../../../navigation/types';
import {useCartStore} from '../../../store/cartStore';
import type {
  AppliedPaymentDiscount,
  BillMode,
  CardTypeName,
  DiscountCoupon,
  GiftCardDetails,
  PaymentMethodKey,
  PaymentRequestPayload,
  PaymentSplitDraft,
  PaymentUiStatus,
  ServiceTaxConfig,
} from '../../../types/payment';
import {formatCurrency} from '../../../utils/currency';
import {clearDirectOrderId, DIRECT_ORDER_STORAGE_KEYS} from '../../../utils/directOrderStorage';
import {hydrateCartFromOrder} from '../../../utils/orderCartMapper';
import {roundMoney} from '../../../utils/receiptFormat';
import {
  formatServiceTaxRate,
  SERVICE_CHARGE_NO_TIP_MESSAGE,
} from '../../../utils/serviceCharge';
import {
  filterItemsBySeat,
  proportionalOrderTotalsForItems,
} from '../../../utils/seatHelpers';
import type {ReceiptOrder} from '../../../types/receipt';

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
    total: routeTotal,
    paymentSeed,
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
  const [hydrateAttempt, setHydrateAttempt] = useState(0);

  const [giftCardDetails, setGiftCardDetails] = useState<GiftCardDetails | null>(null);
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [isVerifyingGiftCard, setIsVerifyingGiftCard] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const isPayingRef = useRef(false);

  const navigateToReceipt = useCallback(
    (
      order: NonNullable<Awaited<ReturnType<typeof processPayment>>['order']>,
      receiptPrintJobId?: string | null,
      receiptTaxBreakdown?: TaxBreakdownLine[],
      receiptPrintJobIds?: string[],
    ) => {
      markOrderPaid(order);
      const splitCount = Array.isArray(order.paymentSplits)
        ? order.paymentSplits.length
        : 0;
      if (splitCount > 1) {
        toast.success(
          `${splitCount} split receipt slips sent to the printer`,
        );
      }
      navigation.replace('Receipt', {
        orderSnapshot: order,
        sessionId,
        orderType,
        tableId,
        taxBreakdown: receiptTaxBreakdown ?? order.taxBreakdown,
        printJobId: receiptPrintJobId ?? undefined,
        printJobIds: receiptPrintJobIds,
      });
    },
    [markOrderPaid, navigation, orderType, sessionId, tableId],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateOrder = async () => {
      let activeOrderId = resolvedOrderId;
      if (!activeOrderId && sessionId) {
        try {
          const sessionOrder = await fetchOrderBySession(sessionId);
          if (sessionOrder?._id) {
            activeOrderId = sessionOrder._id;
          }
        } catch {
          // Fall through
        }
      }

      if (!activeOrderId) {
        setHydrating(false);
        setHydrateError('No order found. Send KOT or select an order first.');
        return;
      }

      setHydrating(true);
      setHydrateError('');

      try {
        if (isPaymentApiConfigured()) {
          let order: ApiOrder | null = null;
          try {
            order = await fetchOrderById(activeOrderId);
          } catch {
            order = null;
          }
          if (cancelled) {
            return;
          }

          if (!order) {
            // Fallback: today list includes ONLINE / COMPLETED that some orderId GETs used to miss
            try {
              const today = await fetchTodayOrders();
              if (cancelled) {
                return;
              }
              const match = today.data?.find(
                (row) =>
                  String(row._id) === String(activeOrderId) ||
                  (routeOrderNumber &&
                    String(row.orderNumber) === String(routeOrderNumber)),
              );
              if (match) {
              if (
                String(match.paymentStatus ?? '').toUpperCase() === 'PAID' ||
                String(match.status ?? '').toUpperCase() === 'PAID'
              ) {
                const recovery = await fetchPaymentRecoveryState(String(match._id));
                if (recovery.paid && recovery.order) {
                  navigateToReceipt(recovery.order, recovery.printJobId);
                  return;
                }
              }

              if (match.items?.length || match.totalAmount != null) {
                const cartItems = buildCartFromOrderItems(
                  (match.items || []) as ApiOrderItem[],
                );
                const status = String(match.status || '').toUpperCase();
                const hasSentKot =
                  Boolean(match.onlineKotSentAt) ||
                  ['PENDING', 'CONFIRMED', 'COMPLETED', 'PAID'].includes(status);
                hydrateFromOrder({
                  items: cartItems,
                  orderNumber: match.orderNumber,
                  orderId: match._id,
                  orderStatus: match.status,
                  orderNote: match.specialNote,
                  partyName: match.partyName,
                  guestName: match.guestName,
                  guestPhone: match.contactNumber ?? '',
                  guestCountryCode: match.guestCountryCode ?? '+1',
                  guestEmail: match.guestEmail ?? '',
                  hasSentKot,
                  kotCartFingerprint: null,
                  persistedTotals: {
                    subtotal: match.subTotal ?? 0,
                    taxTotal: match.taxTotal ?? 0,
                    discountTotal: match.discountTotal ?? 0,
                    total: match.totalAmount ?? 0,
                  },
                  appliedDiscount: null,
                  serverName: match.processedByName,
                });
                setServerSubtotal(match.subTotal ?? 0);
                setServerTaxTotal(match.taxTotal ?? 0);
                if (match.partyName || match.guestName) {
                  setPartyName(match.partyName || match.guestName || '');
                }
                setIsStaffOrder(match.source === 'STAFF');
                setHydrating(false);
                return;
              }
              }
            } catch {
              // Continue to paymentSeed
            }

            if (paymentSeed) {
              const cartItems = buildCartFromOrderItems(
                (paymentSeed.items || []) as ApiOrderItem[],
              );
              const status = String(paymentSeed.status || '').toUpperCase();
              hydrateFromOrder({
                items: cartItems,
                orderNumber: routeOrderNumber || String(activeOrderId),
                orderId: activeOrderId,
                orderStatus: paymentSeed.status || 'PENDING',
                orderNote: paymentSeed.specialNote,
                partyName: paymentSeed.partyName,
                guestName: paymentSeed.guestName,
                guestPhone: paymentSeed.contactNumber ?? '',
                guestCountryCode: paymentSeed.guestCountryCode ?? '+1',
                guestEmail: paymentSeed.guestEmail ?? '',
                hasSentKot:
                  Boolean(paymentSeed.onlineKotSentAt) ||
                  ['PENDING', 'CONFIRMED', 'COMPLETED', 'PAID'].includes(status),
                kotCartFingerprint: null,
                persistedTotals: {
                  subtotal: routeSubtotal ?? 0,
                  taxTotal: routeTaxTotal ?? 0,
                  discountTotal: paymentSeed.discountTotal ?? 0,
                  total: routeTotal ?? routeSubtotal ?? 0,
                },
                appliedDiscount: null,
                serverName: paymentSeed.processedByName,
              });
              setServerSubtotal(routeSubtotal ?? 0);
              setServerTaxTotal(routeTaxTotal ?? 0);
              if (paymentSeed.partyName || paymentSeed.guestName) {
                setPartyName(
                  paymentSeed.partyName || paymentSeed.guestName || '',
                );
              }
              setIsStaffOrder(paymentSeed.source === 'STAFF');
              setHydrating(false);
              return;
            }

            const recovery = await fetchPaymentRecoveryState(activeOrderId);
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
            const cartItems = buildCartFromOrderItems(
              match.items as ApiOrderItem[],
            );
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
          if (paymentSeed && activeOrderId) {
            const cartItems = buildCartFromOrderItems(
              (paymentSeed.items || []) as ApiOrderItem[],
            );
            hydrateFromOrder({
              items: cartItems,
              orderNumber: routeOrderNumber || String(activeOrderId),
              orderId: activeOrderId,
              orderStatus: paymentSeed.status || 'PENDING',
              orderNote: paymentSeed.specialNote,
              partyName: paymentSeed.partyName,
              guestName: paymentSeed.guestName,
              guestPhone: paymentSeed.contactNumber ?? '',
              guestCountryCode: paymentSeed.guestCountryCode ?? '+1',
              guestEmail: paymentSeed.guestEmail ?? '',
              hasSentKot: true,
              kotCartFingerprint: null,
              persistedTotals: {
                subtotal: routeSubtotal ?? 0,
                taxTotal: routeTaxTotal ?? 0,
                discountTotal: paymentSeed.discountTotal ?? 0,
                total: routeTotal ?? routeSubtotal ?? 0,
              },
              appliedDiscount: null,
              serverName: paymentSeed.processedByName,
            });
            setServerSubtotal(routeSubtotal ?? 0);
            setServerTaxTotal(routeTaxTotal ?? 0);
            setHydrateError('');
          } else {
            setHydrateError('Unable to load order. Check your connection.');
          }
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
  }, [
    resolvedOrderId,
    sessionId,
    employees,
    hydrateAttempt,
    hydrateFromOrder,
    navigateToReceipt,
    paymentSeed,
    routeOrderNumber,
    routeSubtotal,
    routeTaxTotal,
    routeTotal,
  ]);

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
  const isWide = width >= 900;
  const isTabletThreeCol = width >= 1024;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('Card');
  const [billMode, setBillMode] = useState<BillMode>('full');
  const [splitMode, setSplitMode] = useState<SplitMode>('custom');
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitDraft[]>(() =>
    createDefaultSplitRows(),
  );
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
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
    cardAmountTendered.trim() === '' ? NaN : parseFloat(cardAmountTendered);
  const cardPayAmount = Number.isFinite(parsedCardAmount)
    ? Math.max(0, parsedCardAmount)
    : 0;

  const parsedCashAmount =
    cashAmountTendered === '' ? NaN : parseFloat(cashAmountTendered);
  const cashPayAmount = Number.isFinite(parsedCashAmount)
    ? Math.max(0, parsedCashAmount)
    : effectiveCashDue;

  const cashSplitAmount =
    paymentMethod === 'Card' &&
    effectiveCardDue > 0 &&
    cardAmountTendered.trim() !== '' &&
    Number.isFinite(parsedCardAmount) &&
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
    cardAmountTendered.trim() !== '' &&
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

  // Split bill: totals.totalDue already subtracts applied gift card.
  const splitDue = roundMoney(Math.max(0, totals.totalDue));
  const giftCoversSplitBill =
    billMode === 'split' && giftUsedPreview > 0 && splitDue < 0.01;
  const splitAllocated = roundMoney(
    paymentSplits.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0),
  );
  const splitRemaining = roundMoney(splitDue - splitAllocated);
  const splitsValid =
    billMode === 'split' &&
    (giftCoversSplitBill ||
      (paymentSplits.length >= 2 &&
        Math.abs(splitRemaining) < 0.01 &&
        paymentSplits.every((row) => {
          const nameOk = String(row.name || '').trim().length > 0;
          const amt = parseFloat(row.amount);
          const amtOk = Number.isFinite(amt) && amt > 0;
          const methodOk = row.method === 'Cash' || row.method === 'Card';
          const cardOk =
            row.method !== 'Card' ||
            Boolean(String(row.cardType || '').trim());
          return nameOk && amtOk && methodOk && cardOk;
        })));

  const selectedSplit =
    billMode === 'split'
      ? paymentSplits.find((row) => row.id === selectedSplitId) ||
        paymentSplits[0] ||
        null
      : null;

  useEffect(() => {
    if (billMode !== 'split') {
      return;
    }
    if (
      selectedSplitId &&
      paymentSplits.some((row) => row.id === selectedSplitId)
    ) {
      return;
    }
    if (paymentSplits[0]?.id) {
      setSelectedSplitId(paymentSplits[0].id);
    }
  }, [billMode, paymentSplits, selectedSplitId]);

  const currentCardContribution =
    paymentMethod === 'Card'
      ? roundMoney(
          lockedCardAmount + Math.min(cardPayAmount, effectiveCardDue),
        )
      : lockedCardAmount;
  const currentCashContribution =
    paymentMethod === 'Cash'
      ? roundMoney(
          lockedCashAmount +
            (Number.isFinite(parsedCashAmount)
              ? Math.min(cashPayAmount, effectiveCashDue)
              : 0),
        )
      : lockedCashAmount;

  const historyRemainingDue = useMemo(() => {
    if (paymentMethod === 'GiftCard') {
      return remainingAfterGift;
    }
    if (paymentMethod === 'Card') {
      if (cashSplitAmount > 0) {
        return cashSplitAmount;
      }
      return roundMoney(
        Math.max(
          0,
          totals.totalDue -
            lockedCashAmount -
            lockedCardAmount -
            Math.min(cardPayAmount, effectiveCardDue),
        ),
      );
    }
    if (paymentMethod === 'Cash') {
      if (cardSplitFromCash > 0) {
        return cardSplitFromCash;
      }
      return roundMoney(
        Math.max(
          0,
          totals.totalDue -
            lockedCardAmount -
            lockedCashAmount -
            (Number.isFinite(parsedCashAmount)
              ? Math.min(cashPayAmount, effectiveCashDue)
              : 0),
        ),
      );
    }
    return totals.totalDue;
  }, [
    paymentMethod,
    remainingAfterGift,
    cashSplitAmount,
    cardSplitFromCash,
    totals.totalDue,
    lockedCashAmount,
    lockedCardAmount,
    cardPayAmount,
    effectiveCardDue,
    cashPayAmount,
    effectiveCashDue,
    parsedCashAmount,
  ]);

  const historyLines = useMemo(() => {
    const lines: Array<{
      id: string;
      label: string;
      value: string;
      tone?: 'green' | 'orange' | 'emerald' | 'amber';
      strong?: boolean;
    }> = [];
    if (giftUsedPreview > 0) {
      lines.push({
        id: 'gift',
        label: 'Gift card',
        value: `−${formatCurrency(giftUsedPreview)}`,
        tone: 'green',
      });
    }
    if (lockedCardAmount > 0) {
      lines.push({
        id: 'locked-card',
        label: 'Locked card',
        value: formatCurrency(lockedCardAmount),
      });
    }
    if (lockedCashAmount > 0) {
      lines.push({
        id: 'locked-cash',
        label: 'Locked cash',
        value: formatCurrency(lockedCashAmount),
      });
    }
    if (
      paymentMethod === 'Card' &&
      (currentCardContribution > 0 || cashSplitAmount > 0)
    ) {
      lines.push({
        id: 'card-current',
        label: selectedCardType
          ? `Card · ${selectedCardType}`
          : 'Card (current)',
        value: formatCurrency(Math.min(cardPayAmount, effectiveCardDue)),
        tone: 'orange',
      });
    }
    if (paymentMethod === 'Cash') {
      lines.push({
        id: 'cash-current',
        label: 'Cash (current)',
        value: formatCurrency(
          Number.isFinite(parsedCashAmount)
            ? Math.min(cashPayAmount, effectiveCashDue)
            : 0,
        ),
        tone: 'emerald',
      });
    }
    if (autoTip > 0) {
      lines.push({
        id: 'tip',
        label: `Tip (${tipMethod || '—'})`,
        value: formatCurrency(autoTip),
        tone: 'orange',
      });
    }
    lines.push({
      id: 'remaining',
      label: 'Remaining due',
      value: formatCurrency(historyRemainingDue),
      tone: 'amber',
      strong: true,
    });
    return lines;
  }, [
    giftUsedPreview,
    lockedCardAmount,
    lockedCashAmount,
    paymentMethod,
    currentCardContribution,
    cashSplitAmount,
    selectedCardType,
    cardPayAmount,
    effectiveCardDue,
    parsedCashAmount,
    cashPayAmount,
    effectiveCashDue,
    autoTip,
    tipMethod,
    historyRemainingDue,
  ]);

  const receiptPreviewOrder = useMemo((): ReceiptOrder => {
    const showSeatFiltered =
      billMode === 'split' &&
      selectedSplit != null &&
      selectedSplit.seatNumber !== undefined;

    const receiptItems = showSeatFiltered
      ? filterItemsBySeat(items, selectedSplit?.seatNumber ?? null)
      : items;

    const seatTotals =
      showSeatFiltered && receiptItems.length
        ? proportionalOrderTotalsForItems(
            {
              items,
              discountTotal: totals.discountTotal,
              taxTotal: totals.taxTotal,
              serviceChargeTotal: totals.serviceChargeTotal,
              totalAmount: totals.totalDue + giftUsedPreview,
              taxBreakdown: totals.taxBreakdown,
            },
            receiptItems,
          )
        : null;

    const splitAmount =
      billMode === 'split' && selectedSplit
        ? roundMoney(parseFloat(selectedSplit.amount) || 0)
        : 0;

    const previewMethod =
      billMode === 'split' && selectedSplit
        ? selectedSplit.method === 'Card' && selectedSplit.cardType
          ? `Card - ${selectedSplit.cardType}`
          : selectedSplit.method
        : paymentMethod === 'Card' && selectedCardType
          ? `Card - ${selectedCardType}`
          : paymentMethod === 'GiftCard'
            ? 'Gift Card'
            : paymentMethod;

    const party =
      billMode === 'split' && selectedSplit
        ? String(selectedSplit.name || '').trim() || partyName
        : partyName;

    return {
      orderNumber: String(displayOrderNumber),
      orderId: resolvedOrderId || undefined,
      tableNo: tableNumber,
      floorName,
      guestName: party,
      partyName: party,
      guestCount,
      items: items as ReceiptOrder['items'],
      subTotal: Number(seatTotals?.subTotal ?? totals.subTotal),
      taxTotal: Number(seatTotals?.taxTotal ?? totals.taxTotal),
      discountTotal: Number(seatTotals?.discountTotal ?? totals.discountTotal),
      discountCode: appliedDiscount?.code,
      serviceChargeTotal: Number(
        seatTotals?.serviceChargeTotal ?? totals.serviceChargeTotal,
      ),
      serviceChargeName: totals.serviceChargeName,
      totalAmount:
        billMode === 'split' && selectedSplit
          ? splitAmount > 0
            ? splitAmount
            : Number(seatTotals?.totalAmount ?? totals.totalDue)
          : totals.totalDue + giftUsedPreview,
      tipAmount: billMode === 'full' ? (includeServiceCharge ? 0 : autoTip) : 0,
      tipMethod:
        billMode === 'full' && autoTip > 0
          ? tipMethod || undefined
          : undefined,
      giftcardUsedAmount: billMode === 'full' ? giftUsedPreview : 0,
      cashAmount:
        billMode === 'full'
          ? currentCashContribution
          : selectedSplit?.method === 'Cash'
            ? splitAmount
            : 0,
      cardAmount:
        billMode === 'full'
          ? currentCardContribution
          : selectedSplit?.method === 'Card'
            ? splitAmount
            : 0,
      paymentMethod: previewMethod,
      taxBreakdown: (seatTotals?.taxBreakdown ??
        totals.taxBreakdown) as ReceiptOrder['taxBreakdown'],
      source:
        orderType === 'staff'
          ? 'STAFF'
          : orderType === 'takeaway'
            ? 'TAKEAWAY'
            : orderType === 'online'
              ? 'ONLINE'
              : undefined,
      filterReceiptBySeat: Boolean(showSeatFiltered),
    };
  }, [
    billMode,
    selectedSplit,
    items,
    totals,
    giftUsedPreview,
    paymentMethod,
    selectedCardType,
    partyName,
    displayOrderNumber,
    resolvedOrderId,
    tableNumber,
    floorName,
    guestCount,
    appliedDiscount?.code,
    includeServiceCharge,
    autoTip,
    tipMethod,
    currentCashContribution,
    currentCardContribution,
    orderType,
  ]);

  const completeDisabled = useMemo(() => {
    if (hydrating || hydrateError) {
      return true;
    }
    if (paymentStatus === 'processing') {
      return true;
    }
    if (billMode === 'split') {
      return !splitsValid;
    }
    if (includeServiceCharge && autoTip > 0) {
      return true;
    }
    if (paymentMethod === 'GiftCard' && totals.totalDue > 0) {
      return giftUsedPreview < totals.totalDue;
    }
    if (paymentMethod === 'Card') {
      if (effectiveCardDue > 0) {
        if (!selectedCardType) {
          return true;
        }
        if (
          cardAmountTendered.trim() === '' ||
          !Number.isFinite(parsedCardAmount) ||
          parsedCardAmount <= 0
        ) {
          return true;
        }
      }
      if (cashSplitAmount > 0) {
        return true;
      }
    }
    if (paymentMethod === 'Cash') {
      if (lockedCardAmount > 0 && !selectedCardType) {
        return true;
      }
      if (cardSplitFromCash > 0) {
        return true;
      }
    }
    return false;
  }, [
    hydrating,
    hydrateError,
    paymentStatus,
    billMode,
    splitsValid,
    includeServiceCharge,
    autoTip,
    paymentMethod,
    totals.totalDue,
    giftUsedPreview,
    effectiveCardDue,
    selectedCardType,
    cardAmountTendered,
    parsedCardAmount,
    cashSplitAmount,
    lockedCardAmount,
    cardSplitFromCash,
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
    if (isPayingRef.current) {
      return;
    }

    if (billMode === 'split') {
      if (!splitsValid) {
        toast.error(
          'Complete all split payers so amounts equal the total due.',
        );
        return;
      }
    } else if (includeServiceCharge && autoTip > 0) {
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

    if (
      billMode === 'full' &&
      paymentMethod === 'Card' &&
      effectiveCardDue > 0
    ) {
      if (!selectedCardType) {
        toast.error('Please select a card type.');
        return;
      }
      if (
        cardAmountTendered.trim() === '' ||
        !Number.isFinite(parsedCardAmount) ||
        parsedCardAmount <= 0
      ) {
        toast.error('Please enter the card amount or tap Exact.');
        return;
      }
    }

    isPayingRef.current = true;
    setPaymentStatus('processing');
    setStatusMessage('Processing payment...');

    const giftUsedAmount = giftUsedPreview;
    const serverAmount = roundMoney(
      totals.subTotal -
        totals.discountTotal +
        totals.taxTotal +
        totals.serviceChargeTotal,
    );

    let resolvedCashAmount = 0;
    let resolvedCardAmount = 0;
    let resolvedPaymentMethod = paymentMethod as string;
    let selectedCardForPayload: CardTypeName | '' = selectedCardType;
    let finalTip = 0;
    let finalTipMethod: string | null = null;
    let splitsPayload:
      | Array<{
          name: string;
          amount: number;
          method: 'Cash' | 'Card';
          cardType: string | null;
          seatNumber: number | null;
        }>
      | null = null;

    if (billMode === 'split') {
      if (giftUsedAmount > 0 && splitDue < 0.01) {
        splitsPayload = null;
        resolvedPaymentMethod = 'Gift Card';
        selectedCardForPayload = '';
      } else {
        splitsPayload = paymentSplits.map((row) => ({
          name: String(row.name || '').trim(),
          amount: roundMoney(parseFloat(row.amount) || 0),
          method: row.method === 'Cash' ? 'Cash' : 'Card',
          cardType:
            row.method === 'Card'
              ? String(row.cardType || '').trim() || null
              : null,
          seatNumber:
            row.seatNumber === undefined || row.seatNumber === null
              ? null
              : Number(row.seatNumber),
        }));
        resolvedCashAmount = roundMoney(
          splitsPayload
            .filter((s) => s.method === 'Cash')
            .reduce((sum, row) => sum + row.amount, 0),
        );
        resolvedCardAmount = roundMoney(
          splitsPayload
            .filter((s) => s.method === 'Card')
            .reduce((sum, row) => sum + row.amount, 0),
        );
        const methodParts = [
          ...new Set(
            splitsPayload.map((s) =>
              s.method === 'Card' && s.cardType
                ? `Card - ${s.cardType}`
                : s.method,
            ),
          ),
        ];
        resolvedPaymentMethod =
          methodParts.length <= 3
            ? `Split (${splitsPayload.length}) · ${methodParts.join(' + ')}`
            : `Split (${splitsPayload.length})`;
        if (giftUsedAmount > 0) {
          resolvedPaymentMethod = `${resolvedPaymentMethod} + Gift Card`;
        }
        const firstCard = splitsPayload.find(
          (s) => s.method === 'Card' && s.cardType,
        );
        selectedCardForPayload = (firstCard?.cardType as CardTypeName) || '';
      }
    } else {
      resolvedCashAmount = lockedCashAmount;
      resolvedCardAmount = lockedCardAmount;
      const parts: string[] = [];
      if (giftUsedAmount > 0) {
        parts.push('Gift Card');
      }

      if (paymentMethod === 'Card') {
        const cardPortion = roundMoney(
          Math.min(cardPayAmount, effectiveCardDue),
        );
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
          resolvedCashAmount = roundMoney(
            lockedCashAmount + remainingAfterGift + autoTip,
          );
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

      resolvedPaymentMethod =
        parts.length > 0 ? parts.join(' + ') : paymentMethod;
      finalTip = includeServiceCharge ? 0 : autoTip;
      finalTipMethod = finalTip > 0 ? (tipMethod ?? null) : null;

      const payableTotalWithTip = roundMoney(serverAmount + finalTip);
      if (resolvedCardAmount > 0) {
        const maxCard = roundMoney(
          Math.max(
            0,
            payableTotalWithTip - resolvedCashAmount - giftUsedAmount,
          ),
        );
        resolvedCardAmount = Math.min(resolvedCardAmount, maxCard);
      }
    }

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
      cardType:
        resolvedCardAmount > 0
          ? selectedCardForPayload || undefined
          : undefined,
      giftCardCode:
        giftUsedAmount > 0 ? giftCardCode.trim().toUpperCase() : undefined,
      giftCardUsedAmount: giftUsedAmount > 0 ? giftUsedAmount : undefined,
      splitAmount:
        giftUsedAmount > 0
          ? roundMoney(Math.max(0, serverAmount - giftUsedAmount))
          : undefined,
      paymentSplits: splitsPayload ?? undefined,
    };

    try {
      const result = await processPayment(payload, items);

      if (!result.success || !result.order) {
        const recovery = await fetchPaymentRecoveryState(resolvedOrderId);
        let paidSnapshot = recovery.order;

        if (!paidSnapshot && result.alreadyPaid) {
          paidSnapshot = {
            orderId: resolvedOrderId,
            orderNumber: displayOrderNumber,
            partyName,
            guestCount,
            tableNo: tableNumber,
            floorName,
            subTotal: totals.subTotal,
            taxTotal: totals.taxTotal,
            discountTotal: totals.discountTotal,
            totalAmount: serverAmount,
            paymentMethod: resolvedPaymentMethod,
            paymentStatus: 'PAID',
            paidAt: new Date().toISOString(),
            items,
            taxBreakdown: totals.taxBreakdown,
            paymentSplits: splitsPayload ?? undefined,
          };
        }

        if (paidSnapshot) {
          if (orderType === 'takeaway') {
            await clearDirectOrderId(DIRECT_ORDER_STORAGE_KEYS.takeaway);
          } else if (orderType === 'staff') {
            await clearDirectOrderId(DIRECT_ORDER_STORAGE_KEYS.staff);
          }
          navigateToReceipt(
            paidSnapshot,
            recovery.printJobId,
            paidSnapshot.taxBreakdown ?? totals.taxBreakdown,
            recovery.printJobIds,
          );
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

      if (orderType === 'takeaway') {
        await clearDirectOrderId(DIRECT_ORDER_STORAGE_KEYS.takeaway);
      } else if (orderType === 'staff') {
        await clearDirectOrderId(DIRECT_ORDER_STORAGE_KEYS.staff);
      }

      setPaymentStatus('success');
      if (
        !(
          Array.isArray(result.order.paymentSplits) &&
          result.order.paymentSplits.length > 1
        )
      ) {
        toast.success('Payment collected successfully!');
      }
      navigateToReceipt(
        result.order,
        result.printJobId,
        totals.taxBreakdown,
        result.printJobIds,
      );
    } finally {
      isPayingRef.current = false;
    }
  }, [
    appliedDiscount,
    autoTip,
    billMode,
    cardAmountTendered,
    cardPayAmount,
    cashPayAmount,
    completeDisabled,
    displayOrderNumber,
    effectiveCardDue,
    effectiveCashDue,
    floorName,
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
    paymentSplits,
    remainingAfterGift,
    resolvedOrderId,
    selectedCardType,
    sessionId,
    splitDue,
    splitsValid,
    tableNumber,
    tipMethod,
    totals,
  ]);

  const handleCancel = () => {
    setPaymentStatus('cancelled');
    navigation.goBack();
  };

  const discountSection = (
    <View style={styles.discountSection}>
      <Text style={styles.controlsTitle}>
        {isStaffOrder ? 'STAFF DISCOUNT' : 'APPLY DISCOUNT'}
      </Text>
      {appliedDiscount ? (
        <View style={styles.appliedDiscount}>
          <View style={styles.appliedDiscountInfo}>
            <View style={styles.appliedDiscountLeft}>
              <CheckCircle2 size={18} color="#16A34A" />
              <View>
                <Text style={styles.appliedDiscountCode}>
                  {appliedDiscount.code}
                </Text>
                <Text style={styles.appliedDiscountSavings}>
                  {appliedDiscount.type === 'percent'
                    ? `${appliedDiscount.value}% off · -${formatCurrency(totals.discountTotal)}`
                    : `-${formatCurrency(totals.discountTotal)}`}
                </Text>
              </View>
            </View>
          </View>
          {!isStaffOrder ? (
            <Pressable
              style={styles.removeDiscountButton}
              onPress={handleRemoveDiscount}
              accessibilityRole="button"
              accessibilityLabel="Remove discount">
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.discountControls}>
          <Pressable
            style={styles.selectDiscountBtn}
            onPress={() => setIsDiscountModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Select a discount">
            <Text style={styles.selectDiscountBtnText}>
              {availableDiscounts.length > 0
                ? 'Select a discount...'
                : 'No active discounts'}
            </Text>
            <ChevronDown size={16} color={colors.primary} />
          </Pressable>
          <View style={styles.discountInputRow}>
            <View style={styles.discountInputWrap}>
              <Percent size={14} color="#A1A1AA" />
              <TextInput
                style={styles.discountInput}
                value={discountCode}
                onChangeText={(val) => setDiscountCode(val.toUpperCase())}
                placeholder="Or enter code..."
                placeholderTextColor="#A1A1AA"
                autoCapitalize="characters"
                accessibilityLabel="Discount code"
              />
            </View>
            <Pressable
              style={[
                styles.exactButton,
                !discountCode.trim() && styles.completeDisabled,
              ]}
              onPress={() => handleApplyDiscount()}
              disabled={!discountCode.trim()}
              accessibilityRole="button"
              accessibilityLabel="Apply discount">
              <Text style={styles.exactButtonText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  const serviceChargeSection = serviceTax ? (
    <Pressable
      style={styles.serviceChargeCard}
      onPress={handleToggleServiceCharge}
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
      <View style={styles.serviceChargeInfo}>
        <Text style={styles.serviceChargeText}>
          Add {serviceTax.name || 'Server Charge'}
        </Text>
        <Text style={styles.fieldHelper}>
          {formatServiceTaxRate(serviceTax)}
          {totals.serviceChargeTotal > 0
            ? ` · ${formatCurrency(totals.serviceChargeTotal)}`
            : ''}
        </Text>
      </View>
    </Pressable>
  ) : null;

  const paymentControls = (
    <ScrollView
      style={styles.controlsScroll}
      contentContainerStyle={styles.controlsContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <Text style={styles.controlsTitle}>BILLING MODE</Text>
      <View style={styles.billModeRow}>
        <Pressable
          style={[
            styles.billModeChip,
            billMode === 'full' && styles.billModeChipSelected,
          ]}
          onPress={() => setBillMode('full')}
          accessibilityRole="button"
          accessibilityState={{selected: billMode === 'full'}}>
          <Text
            style={[
              styles.billModeChipText,
              billMode === 'full' && styles.billModeChipTextSelected,
            ]}>
            Pay in full
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.billModeChip,
            billMode === 'split' && styles.billModeChipSelected,
          ]}
          onPress={() => {
            setBillMode('split');
            if (paymentSplits[0]?.id) {
              setSelectedSplitId(paymentSplits[0].id);
            }
          }}
          accessibilityRole="button"
          accessibilityState={{selected: billMode === 'split'}}>
          <Text
            style={[
              styles.billModeChipText,
              billMode === 'split' && styles.billModeChipTextSelected,
            ]}>
            Split bill
          </Text>
        </Pressable>
      </View>

      {billMode === 'split' ? (
        <>
          {splitMode !== 'by_seat' ? (
            <>
              <Text style={styles.controlsTitle}>GIFT CARD (OPTIONAL)</Text>
              <View style={styles.methodSection}>
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
                            Math.min(
                              giftCardBalance,
                              totals.subTotal -
                                totals.discountTotal +
                                totals.taxTotal +
                                totals.serviceChargeTotal,
                            ),
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
              </View>
            </>
          ) : null}

          <Text style={styles.controlsTitle}>SPLIT PAYERS</Text>
          <SplitBillEditor
            splitDue={splitDue}
            giftUsed={giftUsedPreview}
            rows={paymentSplits}
            onChangeRows={(rows) => {
              setPaymentSplits(rows);
              if (
                selectedSplitId &&
                !rows.some((row) => row.id === selectedSplitId)
              ) {
                setSelectedSplitId(rows[0]?.id ?? null);
              }
            }}
            splitMode={splitMode}
            onSplitModeChange={setSplitMode}
            orderItems={items}
            selectedId={selectedSplitId}
            onSelectRow={setSelectedSplitId}
          />
          {serviceChargeSection}
          {discountSection}
        </>
      ) : (
        <>
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
                    Enter less than the card due to pay the rest with another
                    method.
                  </Text>
                  {cardOverpay > 0 && paymentMethod === 'Card' ? (
                    includeServiceCharge ? (
                      <View style={styles.serviceChargeErrorBox}>
                        <Text style={styles.serviceChargeErrorText}>
                          {SERVICE_CHARGE_NO_TIP_MESSAGE} Please enter the exact
                          amount ({formatCurrency(effectiveCardDue)}) to complete
                          payment.
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
                    handleSwitchForRemainder(nextMethod, {
                      lockCard: cardPortion,
                    });
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
                  Enter less than the due amount to pay the rest with another
                  method.
                </Text>
                {cashOverpay > 0 && paymentMethod === 'Cash' ? (
                  includeServiceCharge ? (
                    <View style={styles.serviceChargeErrorBox}>
                      <Text style={styles.serviceChargeErrorText}>
                        {SERVICE_CHARGE_NO_TIP_MESSAGE} Please enter the exact
                        amount ({formatCurrency(effectiveCashDue)}) to complete
                        payment.
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
                    handleSwitchForRemainder(nextMethod, {
                      lockCash: cashPortion,
                    });
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

          {serviceChargeSection}
          {discountSection}
        </>
      )}

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

  const liveBillPane = (
    <View style={styles.liveBillPane}>
      <View style={styles.liveBillHeader}>
        <Text style={styles.controlsTitle}>LIVE BILL</Text>
        <Text style={styles.liveBillSubtitle}>
          {billMode === 'split' && selectedSplit
            ? `Preview · ${
                String(selectedSplit.name || '').trim() ||
                (selectedSplit.seatNumber == null &&
                selectedSplit.seatNumber !== undefined
                  ? 'Table'
                  : selectedSplit.seatNumber != null
                    ? `Seat ${selectedSplit.seatNumber}`
                    : 'Selected group')
              }`
            : 'Customer receipt preview'}
        </Text>
      </View>
      <ScrollView
        style={styles.liveBillScroll}
        contentContainerStyle={styles.liveBillContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.partyCard}>
          <View style={styles.partyLabelRow}>
            <User size={13} color="#4F46E5" strokeWidth={2.2} />
            <Text style={styles.controlsTitle}>
              PARTY NAME
              {billMode === 'split' ? ' · THIS BILL' : ''}
            </Text>
          </View>
          <TextInput
            style={[
              styles.input,
              billMode === 'split' && !selectedSplit && styles.inputDisabled,
            ]}
            value={
              billMode === 'split' && selectedSplit
                ? String(selectedSplit.name || '')
                : partyName
            }
            onChangeText={(next) => {
              if (billMode === 'split' && selectedSplit) {
                setPaymentSplits((prev) =>
                  prev.map((row) =>
                    row.id === selectedSplit.id ? {...row, name: next} : row,
                  ),
                );
              } else {
                setPartyName(next);
              }
            }}
            editable={!(billMode === 'split' && !selectedSplit)}
            placeholder="Customer name for this receipt"
            placeholderTextColor="#A1A1AA"
            accessibilityLabel="Party name"
          />
          <Text style={styles.fieldHelper}>
            {billMode === 'split' && !selectedSplit
              ? 'Select a seat/group on the left to set its party name.'
              : billMode === 'split'
                ? 'Prints as Party on this seat/group receipt only.'
                : 'Prints as Party on the customer receipt.'}
          </Text>
        </View>

        <View style={styles.receiptCard}>
          <ReceiptPreview
            mode="customer"
            order={receiptPreviewOrder}
            taxBreakdown={receiptPreviewOrder.taxBreakdown}
            guestCount={guestCount}
            restaurantName={config.APP_NAME.toUpperCase()}
            jobMetadata={
              billMode === 'split' && selectedSplit
                ? ({
                    isSplitReceipt: true,
                    filterReceiptBySeat:
                      selectedSplit.seatNumber !== undefined,
                    splitSeatNumber: selectedSplit.seatNumber ?? null,
                    splitSeatNumbers: [selectedSplit.seatNumber ?? null],
                    splitName: String(selectedSplit.name || '').trim(),
                    splitAmount: roundMoney(
                      parseFloat(selectedSplit.amount) || 0,
                    ),
                    splitMethod: selectedSplit.method,
                    paymentMethod: selectedSplit.method,
                    cashAmount:
                      selectedSplit.method === 'Cash'
                        ? roundMoney(parseFloat(selectedSplit.amount) || 0)
                        : 0,
                    cardAmount:
                      selectedSplit.method === 'Card'
                        ? roundMoney(parseFloat(selectedSplit.amount) || 0)
                        : 0,
                    tipAmount: 0,
                    giftcardUsedAmount: 0,
                  } as Record<string, unknown>)
                : null
            }
          />
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ArrowLeft size={18} color={colors.text} strokeWidth={2.4} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>#{displayOrderNumber}</Text>
        </View>
      </View>

      <View
        style={[
          styles.body,
          isWide && styles.bodyWide,
          isTabletThreeCol && styles.bodyThreeCol,
        ]}>
        {hydrating ? (
          <PaymentPageSkeleton />
        ) : hydrateError ? (
          <NetworkErrorState
            title="Unable to load order"
            message={hydrateError}
            onRetry={() => {
              setHydrateError('');
              setHydrating(true);
              setHydrateAttempt((n) => n + 1);
            }}
          />
        ) : (
          <>
            <View
              style={[
                styles.historyPane,
                isWide && styles.historyPaneWide,
                isTabletThreeCol && styles.historyPaneThreeCol,
              ]}>
              <PaymentHistoryPanel
                billMode={billMode}
                historyLines={historyLines}
                billTotal={
                  billMode === 'split'
                    ? splitDue + giftUsedPreview
                    : totals.totalDue +
                      giftUsedPreview +
                      (includeServiceCharge ? 0 : autoTip)
                }
                billTotalLabel={billMode === 'split' ? 'Split due' : 'Bill total'}
                giftCoversSplitBill={giftCoversSplitBill}
                paymentSplits={paymentSplits}
                selectedSplitId={selectedSplitId}
                onSelectSplit={setSelectedSplitId}
                splitRemaining={splitRemaining}
              />
            </View>

            <View
              style={[
                styles.controlsPane,
                isWide && styles.controlsPaneWide,
                isTabletThreeCol && styles.controlsPaneThreeCol,
              ]}>
              {paymentControls}
            </View>

            <View
              style={[
                styles.receiptPane,
                isWide && styles.receiptPaneWide,
                isTabletThreeCol && styles.receiptPaneThreeCol,
              ]}>
              {liveBillPane}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.2,
  },
  orderBadge: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
  },
  orderBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  body: {
    flex: 1,
  },
  bodyWide: {
    flexDirection: 'row',
  },
  bodyThreeCol: {
    flexDirection: 'row',
  },
  historyPane: {
    maxHeight: '32%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  historyPaneWide: {
    maxHeight: undefined,
    flex: 0.9,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  historyPaneThreeCol: {
    flex: 0,
    width: 300,
    maxWidth: 320,
  },
  controlsPane: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 220,
  },
  controlsPaneWide: {
    flex: 1.2,
  },
  controlsPaneThreeCol: {
    flex: 1,
    minWidth: 320,
  },
  receiptPane: {
    maxHeight: '38%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#F4F4F5',
  },
  receiptPaneWide: {
    maxHeight: undefined,
    flex: 1,
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  receiptPaneThreeCol: {
    flex: 0,
    width: 360,
    maxWidth: 380,
  },
  liveBillPane: {
    flex: 1,
  },
  liveBillHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  liveBillSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  liveBillScroll: {
    flex: 1,
  },
  liveBillContent: {
    padding: 12,
    gap: 12,
  },
  partyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
  partyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  controlsScroll: {
    flex: 1,
  },
  controlsContent: {
    padding: 20,
    gap: 16,
  },
  controlsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  billModeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  billModeChip: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  billModeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  billModeChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  billModeChipTextSelected: {
    color: '#C2410C',
  },
  serviceChargeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  serviceChargeInfo: {
    flex: 1,
    gap: 2,
  },
  discountControls: {
    gap: 8,
  },
  discountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountInputWrap: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
  },
  discountInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: 10,
  },
  appliedDiscountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  inputDisabled: {
    backgroundColor: '#F4F4F5',
    color: colors.textSecondary,
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
  selectDiscountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectDiscountBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  appliedDiscount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 8,
  },
  appliedDiscountInfo: {
    flex: 1,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.error,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxMark: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  serviceChargeText: {
    fontSize: 14,
    fontWeight: '700',
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
