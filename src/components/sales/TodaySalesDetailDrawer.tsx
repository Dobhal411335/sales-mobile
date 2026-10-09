import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  AlertCircle,
  Printer,
  Users,
  UtensilsCrossed,
  Wine,
  X,
} from 'lucide-react-native';
import {config} from '../../constants/config';
import type {TodayOrder} from '../../types/todayOrder';
import type {KotLineItem, ReceiptMode, ReceiptOrder} from '../../types/receipt';
import {formatCurrency} from '../../utils/currency';
import {
  getOrderLocationLabel,
  getOrderPartyLabel,
  getOrderTypeBadgeVariant,
  getOrderTypeLabel,
  getPlacerName,
  shouldShowTable,
} from '../../utils/orderDisplay';
import {
  getItemLineTotal,
  isStandaloneExtraLine,
} from '../../utils/productChoices';
import {getReceiptModifierLines} from '../../utils/receiptFormat';
import {
  buildPaymentSplitReceiptSlips,
  buildTicketHistorySlips,
  formatSplitSeatHint,
  type PaymentSplitReceiptSlip,
  type TicketHistorySlip,
} from '../../utils/receiptSlips';
import {
  getOrderGrandTotal,
  getOrderTypeBadgeColors,
  getPaymentStatusColors,
  getStatusColors,
  parsePaymentDetails,
} from '../../utils/todayOrderHelpers';
import {
  fetchPrintJobs,
  reprintTicket,
} from '../../services/printJobService';
import {toast} from '../common/Toast';
import {TabletModal} from '../common/TabletModal';
import {ReceiptPreview} from '../payment/ReceiptPreview';
import {PrintJobStatusStrip} from '../printing/PrintJobStatusStrip';

interface TodaySalesDetailDrawerProps {
  order: TodayOrder | null;
  visible: boolean;
  onClose: () => void;
}

export function TodaySalesDetailDrawer({
  order,
  visible,
  onClose,
}: TodaySalesDetailDrawerProps) {
  const {width, height} = useWindowDimensions();
  const isTablet = width >= 720;
  const drawerWidth = isTablet ? Math.min(Math.max(width * 0.42, 360), 480) : width;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<ReceiptMode>('customer');
  const [printing, setPrinting] = useState(false);
  const [activePrintJobId, setActivePrintJobId] = useState<string | null>(null);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [isReprint, setIsReprint] = useState(false);
  const [ticketHistorySlips, setTicketHistorySlips] = useState<
    TicketHistorySlip[] | null
  >(null);
  const [ticketHistoryLoading, setTicketHistoryLoading] = useState(false);
  const [activeSlipIndex, setActiveSlipIndex] = useState(0);

  const placerName = order ? getPlacerName(order) : null;
  const orderStatusUpper = String(order?.status || '').toUpperCase();
  const statusColors = getStatusColors(order?.status);
  const typeVariant = order ? getOrderTypeBadgeVariant(order) : 'dineIn';
  const typeColors = getOrderTypeBadgeColors(typeVariant);
  const paymentColors =
    orderStatusUpper === 'WAIVED'
      ? {bg: '#F1F5F9', text: '#334155', border: '#E2E8F0'}
      : getPaymentStatusColors(order?.paymentStatus);

  const paymentStatusLabel =
    orderStatusUpper === 'WAIVED'
      ? 'WAIVED'
      : (order?.paymentStatus || 'UNPAID').toUpperCase();

  const parsedPayment = useMemo(() => parsePaymentDetails(order), [order]);

  const grandTotal = order ? getOrderGrandTotal(order) : 0;
  const totalItems = (order?.items || []).reduce(
    (acc, it) => acc + (it.qty || 1),
    0,
  );

  const isBarOrderItem = useCallback(
    (item: {productType?: string; category?: string; name?: string}): boolean => {
      const pType = String(item.productType || '').trim().toUpperCase();
      if (pType === 'BAR') return true;

      const cat = String(item.category || '').trim().toUpperCase();
      const barCategories = [
        'BAR',
        'WINE',
        'BEER',
        'DRINKS',
        'DRINK',
        'BEVERAGES',
        'BEVERAGE',
        'COCKTAILS',
        'COCKTAIL',
        'LIQUOR',
        'SPIRITS',
        'ALCOHOL',
        'BAR & ALCOHOL',
        'BAR / ALCOHOL',
        'HARD LIQUOR',
      ];
      if (barCategories.includes(cat)) {
        return true;
      }

      if (
        cat.includes('BAR') ||
        cat.includes('WINE') ||
        cat.includes('BEER') ||
        cat.includes('ALCOHOL') ||
        cat.includes('COCKTAIL') ||
        cat.includes('LIQUOR')
      ) {
        return true;
      }

      return false;
    },
    [],
  );

  const isKitchenOrderItem = useCallback(
    (item: {productType?: string; category?: string; name?: string}): boolean => {
      return !isBarOrderItem(item);
    },
    [isBarOrderItem],
  );

  const orderItems = useMemo(() => order?.items || [], [order?.items]);

  const barItems = useMemo(
    () => orderItems.filter(isBarOrderItem),
    [orderItems, isBarOrderItem],
  );

  const kitchenItems = useMemo(
    () => orderItems.filter(isKitchenOrderItem),
    [orderItems, isKitchenOrderItem],
  );

  const hasBarItems = barItems.length > 0;
  const hasKitchenItems =
    orderItems.length === 0 ? true : kitchenItems.length > 0;

  const mappedKotItems: KotLineItem[] = useMemo(
    () =>
      kitchenItems.map((it) => ({
        name: it.name,
        qty: it.qty,
        size: it.size,
        preparationStyle: it.preparationStyle,
        options: it.options,
        category: it.category,
      })),
    [kitchenItems],
  );

  const mappedBarItems: KotLineItem[] = useMemo(
    () =>
      barItems.map((it) => ({
        name: it.name,
        qty: it.qty,
        size: it.size,
        preparationStyle: it.preparationStyle,
        options: it.options,
        category: it.category,
      })),
    [barItems],
  );

  const discountPct = useMemo(() => {
    if (!order) return null;
    if (order.discountPercent != null) return Number(order.discountPercent);
    if ((order.subTotal || 0) > 0 && (order.discountTotal || 0) > 0) {
      return (
        Math.round(((order.discountTotal || 0) / (order.subTotal || 0)) * 1000) /
        10
      );
    }
    return null;
  }, [order]);

  const discountLabel = useMemo(() => {
    if (!order) return 'Discount';
    if (discountPct != null && discountPct > 0) {
      return `Discount (${discountPct}%)`;
    }
    if (Number(order.discountTotal || 0) > 0) {
      return `Discount (${formatCurrency(Number(order.discountTotal))})`;
    }
    return 'Discount';
  }, [order, discountPct]);

  const totalHstRate = useMemo(() => {
    if (!order) return null;
    const breakdownRatesSum = (order.taxBreakdown || []).reduce(
      (sum, t) => sum + (Number(t.rate) || 0),
      0,
    );
    if (breakdownRatesSum > 0) {
      return Math.round(breakdownRatesSum * 10) / 10;
    }
    const taxableBase = Math.max(
      0,
      (order.subTotal || 0) - (order.discountTotal || 0),
    );
    if (taxableBase > 0 && (order.taxTotal || 0) > 0) {
      return Math.round(((order.taxTotal || 0) / taxableBase) * 1000) / 10;
    }
    return null;
  }, [order]);

  const hstLabel =
    totalHstRate != null && totalHstRate > 0 ? `HST (${totalHstRate}%)` : 'HST';

  const customerPrintSlips = useMemo(
    () =>
      order
        ? buildPaymentSplitReceiptSlips({
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableNo: order.tableNo,
            floorName: order.floorName || order.floor?.name,
            partyName: order.partyName || order.guestName,
            guestName: order.guestName,
            source: order.source,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            paymentSplits: order.paymentSplits,
            subTotal: order.subTotal || 0,
            taxTotal: order.taxTotal || 0,
            discountTotal: order.discountTotal,
            discountPercent: order.discountPercent,
            tipAmount: order.tipAmount,
            tipMethod: order.tipMethod,
            totalAmount: order.totalAmount,
            cashAmount: order.cashAmount,
            cardAmount: order.cardAmount,
            giftcardUsedAmount: order.giftcardUsedAmount,
            guestCount: order.guestCount,
            specialNote: order.specialNote,
            serviceChargeTotal: order.serviceChargeTotal,
            serviceChargeName: order.serviceChargeName,
            createdAt: order.createdAt,
            items: (order.items || []).map((it) => ({
              ...it,
              seatNumber: it.seatNumber,
              seat: it.seat,
            })),
            taxBreakdown: order.taxBreakdown?.map((t) => ({
              name: t.name || 'HST',
              amount: Number(t.amount ?? t.taxAmount ?? 0),
              rate: t.rate,
            })),
          })
        : null,
    [order],
  );

  const baseReceiptOrder: ReceiptOrder | null = useMemo(() => {
    if (!order) return null;
    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableNo: order.tableNo,
      floorName: order.floorName || order.floor?.name,
      partyName: order.partyName || order.guestName,
      guestName: order.guestName,
      source: order.source,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentSplits: order.paymentSplits,
      subTotal: order.subTotal || 0,
      taxTotal: order.taxTotal || 0,
      discountTotal: order.discountTotal,
      discountPercent: order.discountPercent,
      tipAmount: order.tipAmount,
      tipMethod: order.tipMethod,
      totalAmount: order.totalAmount,
      cashAmount: order.cashAmount,
      cardAmount: order.cardAmount,
      giftcardUsedAmount: order.giftcardUsedAmount,
      guestCount: order.guestCount,
      specialNote: order.specialNote,
      serviceChargeTotal: order.serviceChargeTotal,
      serviceChargeName: order.serviceChargeName,
      createdAt: order.createdAt,
      items: (order.items || []).map((it) => ({
        ...it,
        seatNumber: it.seatNumber,
        seat: it.seat,
      })),
      taxBreakdown: order.taxBreakdown?.map((t) => ({
        name: t.name || 'HST',
        amount: Number(t.amount ?? t.taxAmount ?? 0),
        rate: t.rate,
      })),
    };
  }, [order]);

  const previewSlips = useMemo(() => {
    if (previewMode === 'customer') {
      return customerPrintSlips;
    }
    if (previewMode === 'kot' || previewMode === 'bar') {
      return ticketHistorySlips && ticketHistorySlips.length > 0
        ? ticketHistorySlips
        : null;
    }
    return null;
  }, [previewMode, customerPrintSlips, ticketHistorySlips]);

  const activeCustomerSlip: PaymentSplitReceiptSlip | null =
    previewMode === 'customer' &&
    customerPrintSlips &&
    customerPrintSlips[activeSlipIndex]
      ? customerPrintSlips[activeSlipIndex]
      : null;

  const activeTicketSlip: TicketHistorySlip | null =
    (previewMode === 'kot' || previewMode === 'bar') &&
    ticketHistorySlips &&
    ticketHistorySlips[activeSlipIndex]
      ? ticketHistorySlips[activeSlipIndex]
      : null;

  const previewOrderForModal: ReceiptOrder | null =
    activeCustomerSlip?.order || baseReceiptOrder;

  const previewKotItems = useMemo(() => {
    if (activeTicketSlip?.kotItems?.length) {
      return activeTicketSlip.kotItems;
    }
    return previewMode === 'bar' ? mappedBarItems : mappedKotItems;
  }, [activeTicketSlip, previewMode, mappedBarItems, mappedKotItems]);

  const handleOpenPrintPreview = useCallback(
    async (mode: ReceiptMode) => {
      if (!order) return;
      setPreviewMode(mode);
      setActivePrintJobId(null);
      setPrintMessage(null);
      setPrintError(null);
      setIsReprint(Boolean((order as {isReprint?: boolean})?.isReprint));
      setActiveSlipIndex(0);
      setTicketHistorySlips(null);

      if (mode === 'kot' || mode === 'bar') {
        setTicketHistoryLoading(true);
        try {
          const res = await fetchPrintJobs({
            orderId: order._id,
            printType: mode === 'bar' ? 'BAR_RECEIPT' : 'KOT',
            date: 'all',
            limit: 50,
          });
          if (res.success) {
            const slips = buildTicketHistorySlips(res.data || [], mode);
            setTicketHistorySlips(slips.length ? slips : null);
          } else {
            setTicketHistorySlips(null);
          }
        } catch {
          setTicketHistorySlips(null);
        } finally {
          setTicketHistoryLoading(false);
        }
      }

      setPreviewOpen(true);
    },
    [order],
  );

  const handleExecutePrint = async () => {
    if (!order) return;
    setPrinting(true);
    setPrintError(null);
    const inFlightMessage =
      previewMode === 'bar'
        ? 'Bar ticket is printing...'
        : previewMode === 'kot'
          ? 'KOT is printing...'
          : 'Receipt is printing...';
    setPrintMessage(inFlightMessage);

    try {
      const printTypeMapped =
        previewMode === 'kot'
          ? 'KOT'
          : previewMode === 'bar'
            ? 'BAR_RECEIPT'
            : 'RECEIPT';

      const historyJobId = activeTicketSlip?.jobId;

      const itemsToReprint =
        previewMode === 'kot' || previewMode === 'bar'
          ? previewKotItems
          : orderItems;

      const res = await reprintTicket({
        ...(historyJobId
          ? {jobId: historyJobId}
          : {orderId: order._id}),
        printType: printTypeMapped,
        kotItems: itemsToReprint as unknown[],
        guestCount: order.guestCount,
        serverName: placerName ?? undefined,
        specialNote: order.specialNote,
        restaurantName: config.APP_NAME.toUpperCase(),
      });

      if (res.success) {
        setIsReprint(true);
        if (res.data?.job?._id) {
          setActivePrintJobId(res.data.job._id);
        }
        const queuedMsg =
          previewMode === 'bar'
            ? 'Bar ticket is printing...'
            : previewMode === 'kot'
              ? 'KOT is printing...'
              : 'Receipt is printing...';
        setPrintMessage(queuedMsg);
        toast.success(
          `${previewMode === 'bar' ? 'Bar ticket' : previewMode === 'kot' ? 'KOT' : 'Receipt'} queued for printing`,
        );
      } else {
        const errMsg = res.message || 'Failed to print ticket';
        setPrintError(errMsg);
        setPrintMessage(null);
        toast.error(errMsg);
      }
    } catch {
      const errMsg = 'Failed to print ticket. Check printer connection.';
      setPrintError(errMsg);
      setPrintMessage(null);
      toast.error(errMsg);
    } finally {
      setPrinting(false);
    }
  };

  const headerLocation = useMemo(() => {
    if (!order) return '';
    const location = getOrderLocationLabel(order);
    const party = getOrderPartyLabel(order);
    if (
      !party ||
      String(party).trim().toLowerCase() ===
        String(location).trim().toLowerCase()
    ) {
      return location;
    }
    return `${location} · ${party}`;
  }, [order]);

  if (!order) {
    return null;
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          {/* Backdrop */}
          <Pressable style={styles.backdrop} onPress={onClose} />

          {/* Drawer content */}
          <View
            style={[
              styles.drawer,
              {width: drawerWidth, maxHeight: height},
              !isTablet && styles.drawerMobile,
            ]}>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderLeft}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.orderNumber}>
                    Order #{order.orderNumber}
                  </Text>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor: typeColors.bg,
                        borderColor: typeColors.border,
                      },
                    ]}>
                    <Text
                      style={[styles.typeBadgeText, {color: typeColors.text}]}>
                      {getOrderTypeLabel(order).toUpperCase()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {backgroundColor: statusColors.bg},
                    ]}>
                    <Text
                      style={[styles.statusText, {color: statusColors.text}]}>
                      {order.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.headerLocation}>{headerLocation}</Text>
                {customerPrintSlips && customerPrintSlips.length > 0 ? (
                  <View style={styles.splitHeaderBadge}>
                    <Users size={12} color="#6D28D9" strokeWidth={2.4} />
                    <Text style={styles.splitHeaderBadgeText}>
                      Split Bill · {customerPrintSlips.length}
                    </Text>
                  </View>
                ) : null}

                {placerName ? (
                  <Text style={styles.headerPlacer}>
                    By {placerName}
                    {order.processedByRole ? ` (${order.processedByRole})` : ''}
                  </Text>
                ) : null}
              </View>

              <Pressable
                style={({pressed}) => [
                  styles.closeIconBtn,
                  pressed && styles.closeIconBtnPressed,
                ]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close Drawer">
                <X size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Scrollable Body */}
            <ScrollView
              style={styles.drawerBody}
              contentContainerStyle={styles.drawerBodyContent}
              showsVerticalScrollIndicator={false}>
              {/* Order Info */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Order Info</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Order Type</Text>
                  <View
                    style={[
                      styles.typeBadgeSmall,
                      {
                        backgroundColor: typeColors.bg,
                        borderColor: typeColors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.typeBadgeSmallText,
                        {color: typeColors.text},
                      ]}>
                      {getOrderTypeLabel(order)}
                    </Text>
                  </View>
                </View>

                {shouldShowTable(order) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Table</Text>
                    <Text style={styles.infoValueBold}>
                      {order.tableNo ? `Table ${order.tableNo}` : '—'}
                    </Text>
                  </View>
                )}

                {(order.partyName || order.guestName) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {order.source === 'STAFF'
                        ? 'Staff Member'
                        : 'Party / Guest'}
                    </Text>
                    <Text style={styles.infoValueBold}>
                      {order.partyName || order.guestName}
                    </Text>
                  </View>
                )}

                {order.guestCount != null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Guests / Covers</Text>
                    <Text style={styles.infoValueBold}>{order.guestCount}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Placed At</Text>
                  <Text style={styles.infoValue}>
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {order.source === 'STAFF' && order.staffOrderReason ? (
                  <View style={styles.reasonCard}>
                    <Text style={styles.reasonCardLabel}>Reason</Text>
                    <Text style={styles.reasonCardText}>
                      {order.staffOrderReason}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.divider} />

              {/* Payment Section */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Payment</Text>

                <View
                  style={[
                    styles.paymentCard,
                    {
                      backgroundColor: paymentColors.bg,
                      borderColor: paymentColors.border,
                    },
                  ]}>
                  <Text style={styles.paymentCardLabel}>Status</Text>
                  <Text
                    style={[
                      styles.paymentCardValue,
                      {color: paymentColors.text},
                    ]}>
                    {paymentStatusLabel}
                  </Text>
                </View>

                {orderStatusUpper === 'WAIVED' && order.waiveReason ? (
                  <View style={styles.reasonCard}>
                    <Text style={styles.reasonCardLabel}>Waive Reason</Text>
                    <Text style={styles.reasonCardText}>
                      {order.waiveReason}
                    </Text>
                  </View>
                ) : null}

                {order.paymentMethod || Number(order.giftcardUsedAmount || 0) > 0 ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Method</Text>
                    <Text style={styles.infoValueBold}>
                      {parsedPayment.label}
                    </Text>
                  </View>
                ) : null}

                {Array.isArray(order.paymentSplits) &&
                order.paymentSplits.length > 0 ? (
                  <View style={styles.splitsCard}>
                    <View style={styles.splitsCardTitleRow}>
                      <Text style={styles.splitsCardTitle}>Split Bill</Text>
                      <Text style={styles.splitsCountPill}>
                        {order.paymentSplits.length} payers
                      </Text>
                    </View>
                    {order.paymentSplits.map((row, index) => {
                      const seatHint = formatSplitSeatHint(row);
                      return (
                        <View
                          key={`${row.name}-${index}`}
                          style={styles.splitDetailCard}>
                          <View style={styles.splitDetailTop}>
                            <Text style={styles.splitDetailName} numberOfLines={1}>
                              {row.name || `Payer ${index + 1}`}
                            </Text>
                            <Text style={styles.splitDetailAmount}>
                              {formatCurrency(Number(row.amount) || 0)}
                            </Text>
                          </View>
                          <Text style={styles.splitLine}>
                            {row.method === 'Card' && row.cardType
                              ? `Card - ${row.cardType}`
                              : row.method}
                            {seatHint ? ` · ${seatHint}` : ''}
                            {Number(row.tipAmount) > 0
                              ? ` · Tip ${formatCurrency(Number(row.tipAmount))}`
                              : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tip</Text>
                  <Text style={styles.infoValueBold}>
                    {formatCurrency(Number(order.tipAmount || 0))}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Order Items */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>
                  Order Items ({totalItems})
                </Text>

                <View style={styles.itemsList}>
                  {(order.items || []).map((item, idx) => {
                    const modifierLines = getReceiptModifierLines(item);
                    return (
                      <View key={idx} style={styles.itemRow}>
                        <View style={styles.itemLeft}>
                          <Text style={styles.itemQty}>{item.qty}x</Text>
                          <View style={styles.itemDetails}>
                            <Text style={styles.itemName}>
                              {item.productCode
                                ? `${item.productCode} `
                                : ''}
                              {item.name}
                            </Text>
                            {item.size &&
                            item.size !== 'Standard' &&
                            !isStandaloneExtraLine(item) ? (
                              <Text style={styles.itemMeta}>
                                Variant: {item.size}
                              </Text>
                            ) : null}
                            {modifierLines.map((line, lineIdx) => (
                              <Text
                                key={`${line.kind}-${lineIdx}`}
                                style={
                                  line.kind === 'custom-extra'
                                    ? styles.itemOption
                                    : styles.itemMetaItalic
                                }>
                                {line.text}
                                {line.kind === 'custom-extra' &&
                                line.price != null
                                  ? ` (+${formatCurrency(Number(line.price))})`
                                  : ''}
                              </Text>
                            ))}
                            {item.notes ? (
                              <Text style={styles.itemRemark}>
                                Remark: {item.notes}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <Text style={styles.itemPrice}>
                          {formatCurrency(getItemLineTotal(item))}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {order.specialNote ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Special Note</Text>
                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>
                        &ldquo;{order.specialNote}&rdquo;
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}

              <View style={styles.divider} />

              {/* Financial Calculation Breakdown */}
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(order.subTotal || 0)}
                  </Text>
                </View>

                {Number(order.discountTotal || 0) > 0 && (
                  <>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.discountLabelText}>
                        {discountLabel}
                      </Text>
                      <Text style={styles.discountValueText}>
                        -{formatCurrency(Number(order.discountTotal))}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Net Subtotal</Text>
                      <Text style={styles.breakdownValue}>
                        {formatCurrency(
                          Math.max(
                            0,
                            (order.subTotal || 0) -
                              (order.discountTotal || 0),
                          ),
                        )}
                      </Text>
                    </View>
                  </>
                )}

                {(Number(order.taxTotal || 0) > 0 ||
                  (Number(order.discountTotal || 0) > 0 &&
                    (totalHstRate || 0) > 0)) && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{hstLabel}</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(order.taxTotal || 0)}
                    </Text>
                  </View>
                )}

                {Number(order.serviceChargeTotal || 0) > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {order.serviceChargeName || 'Service Charge'}
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(Number(order.serviceChargeTotal))}
                    </Text>
                  </View>
                )}

                {Number(order.tipAmount || 0) > 0 && (
                  <>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Order Total</Text>
                      <Text style={styles.breakdownValue}>
                        {formatCurrency(Number(order.totalAmount || 0))}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Tip{' '}
                        {order.tipMethod ? `(${order.tipMethod})` : ''}
                      </Text>
                      <Text style={styles.breakdownValue}>
                        {formatCurrency(Number(order.tipAmount || 0))}
                      </Text>
                    </View>
                  </>
                )}

                {Number(order.giftcardUsedAmount || 0) > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Gift Card {order.giftcardCode ? `(${order.giftcardCode})` : ''}
                    </Text>
                    <Text style={[styles.breakdownValue, styles.giftCardValue]}>
                      -{formatCurrency(Number(order.giftcardUsedAmount))}
                    </Text>
                  </View>
                )}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    {formatCurrency(grandTotal)}
                  </Text>
                </View>

                {order.paymentMethod || Number(order.giftcardUsedAmount || 0) > 0 ? (
                  <View style={styles.paymentMethodFooter}>
                    <View style={styles.paymentMethodFooterTop}>
                      <Text style={styles.paymentMethodFooterLabel}>
                        Payment Method
                      </Text>
                      <Text style={styles.paymentMethodFooterValue}>
                        {parsedPayment.label}
                      </Text>
                    </View>
                    {parsedPayment.displayBreakdown ? (
                      <Text style={styles.paymentMethodBreakdownText}>
                        {parsedPayment.displayBreakdown}
                      </Text>
                    ) : null}
                    {Array.isArray(order.paymentSplits) &&
                    order.paymentSplits.length > 0 ? (
                      <View style={styles.splitsCardFooter}>
                        {order.paymentSplits.map((row, index) => (
                          <Text
                            key={`footer-split-${row.name}-${index}`}
                            style={styles.splitLine}>
                            {row.name || `Guest ${index + 1}`}
                            {' · '}
                            {row.method === 'Card' && row.cardType
                              ? `Card - ${row.cardType}`
                              : row.method}
                            {' · '}
                            {formatCurrency(Number(row.amount) || 0)}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {/* Footer Action Buttons */}
            <View style={styles.drawerFooter}>
              <View style={styles.printButtonsRow}>
                <Pressable
                  style={({pressed}) => [
                    styles.receiptBtn,
                    pressed && styles.btnPressed,
                    ticketHistoryLoading && styles.btnDisabled,
                  ]}
                  disabled={ticketHistoryLoading}
                  onPress={() => {
                    void handleOpenPrintPreview('customer');
                  }}>
                  <Printer size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.receiptBtnText}>
                    Receipt
                    {customerPrintSlips && customerPrintSlips.length > 1
                      ? ` (${customerPrintSlips.length})`
                      : ''}
                  </Text>
                </Pressable>

                {hasKitchenItems && (
                  <Pressable
                    style={({pressed}) => [
                      styles.kotBtn,
                      pressed && styles.btnPressed,
                      ticketHistoryLoading && styles.btnDisabled,
                    ]}
                    disabled={ticketHistoryLoading}
                    onPress={() => {
                      void handleOpenPrintPreview('kot');
                    }}>
                    {ticketHistoryLoading && previewMode === 'kot' ? (
                      <ActivityIndicator size="small" color="#3f3f46" />
                    ) : (
                      <UtensilsCrossed
                        size={15}
                        color="#3f3f46"
                        strokeWidth={2.2}
                      />
                    )}
                    <Text style={styles.kotBtnText}>KOT</Text>
                  </Pressable>
                )}

                {hasBarItems && (
                  <Pressable
                    style={({pressed}) => [
                      styles.barBtn,
                      pressed && styles.btnPressed,
                      ticketHistoryLoading && styles.btnDisabled,
                    ]}
                    disabled={ticketHistoryLoading}
                    onPress={() => {
                      void handleOpenPrintPreview('bar');
                    }}>
                    {ticketHistoryLoading && previewMode === 'bar' ? (
                      <ActivityIndicator size="small" color="#3f3f46" />
                    ) : (
                      <Wine size={15} color="#3f3f46" strokeWidth={2.2} />
                    )}
                    <Text style={styles.barBtnText}>Bar</Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                style={({pressed}) => [
                  styles.closeBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ticket Print Preview Modal */}
      {previewOpen && previewOrderForModal && (
        <TabletModal
          visible={previewOpen}
          title={
            previewMode === 'bar'
              ? previewSlips && previewSlips.length > 0
                ? 'Bar ticket history'
                : 'Bar Receipt Preview'
              : previewMode === 'kot'
                ? previewSlips && previewSlips.length > 0
                  ? 'KOT history'
                  : 'Kitchen Order Ticket (KOT)'
                : previewSlips && previewSlips.length > 1
                  ? 'Seat bill preview'
                  : 'Customer Receipt Preview'
          }
          onClose={() => {
            setPreviewOpen(false);
            setTicketHistorySlips(null);
            setActiveSlipIndex(0);
          }}
          maxWidth={920}
          splitContent={{
            left: (
              <View style={styles.previewLeftWrap}>
                {previewSlips && previewSlips.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.slipTabsRow}>
                    {previewSlips.map((slip, idx) => {
                      const active = activeSlipIndex === idx;
                      return (
                        <Pressable
                          key={slip.id}
                          style={[
                            styles.slipTab,
                            active && styles.slipTabActive,
                          ]}
                          onPress={() => setActiveSlipIndex(idx)}>
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
                <ReceiptPreview
                  mode={previewMode}
                  order={previewOrderForModal}
                  kotItems={previewKotItems}
                  barItems={
                    previewMode === 'bar' ? previewKotItems : mappedBarItems
                  }
                  taxBreakdown={
                    previewOrderForModal.taxBreakdown ||
                    (order.taxBreakdown
                      ? order.taxBreakdown.map((t) => ({
                          name: t.name || 'HST',
                          amount: Number(t.amount ?? t.taxAmount ?? 0),
                          rate: t.rate,
                        }))
                      : undefined)
                  }
                  serverName={placerName ?? undefined}
                  guestCount={order.guestCount}
                  specialNote={order.specialNote}
                  restaurantName={config.APP_NAME.toUpperCase()}
                  isReprint={isReprint}
                  jobMetadata={activeCustomerSlip?.jobMetadata ?? null}
                />
              </View>
            ),
            right: (
              <ScrollView
                style={styles.previewRightScroll}
                contentContainerStyle={styles.previewRightContent}
                showsVerticalScrollIndicator={false}>
                {/* Mode & Title */}
                <View style={styles.previewModeHeader}>
                  <View style={styles.previewModeBadge}>
                    <Text style={styles.previewModeBadgeText}>
                      {previewMode === 'bar'
                        ? 'Bar Ticket'
                        : previewMode === 'kot'
                          ? 'Kitchen Ticket (KOT)'
                          : 'Customer Receipt'}
                    </Text>
                  </View>
                  <Text style={styles.previewOrderTitle}>
                    Order #{order.orderNumber}
                  </Text>
                  {previewSlips && previewSlips.length > 0 ? (
                    <Text style={styles.previewSlipHint}>
                      {previewSlips[activeSlipIndex]?.label ||
                        `Slip ${activeSlipIndex + 1}`}
                    </Text>
                  ) : null}
                </View>

                {/* Printing In-Progress Banner (Shows loader + printing message) */}
                {printing && (
                  <View style={styles.printingBanner}>
                    <View style={styles.printingBannerRow}>
                      <ActivityIndicator size="small" color="#EA580C" />
                      <Text style={styles.printingBannerTitle}>
                        {previewMode === 'bar'
                          ? 'Bar ticket is printing...'
                          : previewMode === 'kot'
                            ? 'KOT is printing...'
                            : 'Receipt is printing...'}
                      </Text>
                    </View>
                    <Text style={styles.printingBannerSubtitle}>
                      Sending print request to thermal printer. Please wait...
                    </Text>
                  </View>
                )}

                {/* Real-time Hardware Print Job Status Strip with live socket polling */}
                {activePrintJobId ? (
                  <View style={styles.printJobStripCard}>
                    <PrintJobStatusStrip
                      printJobId={activePrintJobId}
                      label={
                        previewMode === 'bar'
                          ? 'Bar ticket print job'
                          : previewMode === 'kot'
                            ? 'KOT print job'
                            : 'Receipt print job'
                      }
                      printingText={
                        previewMode === 'bar'
                          ? 'Bar ticket is printing...'
                          : previewMode === 'kot'
                            ? 'KOT is printing...'
                            : 'Receipt is printing...'
                      }
                    />
                  </View>
                ) : null}

                {/* Error Banner */}
                {printError ? (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={18} color="#DC2626" />
                    <Text style={styles.errorBannerText}>{printError}</Text>
                  </View>
                ) : null}

                {/* Ready state when idle */}
                {!printing && !activePrintJobId && !printError && (
                  <View style={styles.readyCard}>
                    <View style={styles.readyCardIconWrap}>
                      <Printer size={18} color="#EA580C" />
                    </View>
                    <View style={styles.readyCardTextWrap}>
                      <Text style={styles.readyCardTitle}>Ready to Print</Text>
                      <Text style={styles.readyCardSubtitle}>
                        Tap "Print{' '}
                        {previewMode === 'bar'
                          ? 'Bar Ticket'
                          : previewMode === 'kot'
                            ? 'KOT'
                            : 'Receipt'}
                        " below to send this ticket to the printer.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Meta Summary Card */}
                <View style={styles.previewMetaCard}>
                  {order.tableNo ? (
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Table</Text>
                      <Text style={styles.previewMetaValue}>
                        Table {order.tableNo}
                        {order.floorName ? ` · ${order.floorName}` : ''}
                      </Text>
                    </View>
                  ) : null}

                  {placerName ? (
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Server</Text>
                      <Text style={styles.previewMetaValue}>{placerName}</Text>
                    </View>
                  ) : null}

                  {order.partyName || order.guestName ? (
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Party</Text>
                      <Text style={styles.previewMetaValue}>
                        {order.partyName || order.guestName}
                      </Text>
                    </View>
                  ) : null}

                  {order.guestCount ? (
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewMetaLabel}>Guests</Text>
                      <Text style={styles.previewMetaValue}>
                        {order.guestCount}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.previewMetaRow}>
                    <Text style={styles.previewMetaLabel}>Total</Text>
                    <Text
                      style={[
                        styles.previewMetaValue,
                        styles.previewTotalValue,
                      ]}>
                      {formatCurrency(grandTotal)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ),
          }}
          footerActions={[
            {
              label: isReprint
                ? previewMode === 'bar'
                  ? activeTicketSlip
                    ? 'Reprint this Bar ticket'
                    : 'Reprint Bar Ticket Again'
                  : previewMode === 'kot'
                    ? activeTicketSlip
                      ? 'Reprint this KOT'
                      : 'Reprint KOT Again'
                    : 'Reprint Receipt Again'
                : previewMode === 'bar'
                  ? activeTicketSlip
                    ? 'Print this Bar ticket'
                    : 'Print Bar Ticket'
                  : previewMode === 'kot'
                    ? activeTicketSlip
                      ? 'Print this KOT'
                      : 'Print KOT'
                    : 'Print Receipt',
              loadingLabel:
                previewMode === 'bar'
                  ? 'Bar ticket is printing...'
                  : previewMode === 'kot'
                    ? 'KOT is printing...'
                    : 'Receipt is printing...',
              onPress: handleExecutePrint,
              loading: printing,
              variant: 'primary',
            },
            {
              label: 'Close',
              onPress: () => {
                setPreviewOpen(false);
                setTicketHistorySlips(null);
                setActiveSlipIndex(0);
              },
              variant: 'secondary',
            },
          ]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawer: {
    backgroundColor: '#FFFFFF',
    height: '100%',
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: {width: -4, height: 0},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
    borderLeftWidth: 1,
    borderLeftColor: '#e4e4e7',
    display: 'flex',
    flexDirection: 'column',
  },
  drawerMobile: {
    width: '100%',
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  drawerHeaderLeft: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18181b',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerLocation: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3f3f46',
    marginTop: 2,
  },
  headerPlacer: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181b',
    marginTop: 2,
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconBtnPressed: {
    backgroundColor: '#dc2626',
  },
  drawerBody: {
    flex: 1,
  },
  drawerBodyContent: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#18181b',
  },
  infoValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181b',
  },
  typeBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  typeBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reasonCard: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  reasonCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4f46e5',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  reasonCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#312e81',
  },
  divider: {
    height: 1,
    backgroundColor: '#f4f4f5',
  },
  paymentCard: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  paymentCardValue: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '900',
    color: '#18181b',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181b',
  },
  itemMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52525b',
    marginTop: 1,
  },
  itemMetaItalic: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#52525b',
    marginTop: 1,
  },
  itemOption: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
    color: '#71717a',
    marginTop: 1,
  },
  itemRemark: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#92400E',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181b',
  },
  noteBox: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 10,
    padding: 12,
  },
  noteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#3f3f46',
  },
  breakdownBox: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#52525b',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18181b',
  },
  discountLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  discountValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#18181b',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#f97316',
  },
  paymentMethodFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    marginTop: 2,
    gap: 4,
  },
  paymentMethodFooterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodFooterLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717a',
  },
  paymentMethodFooterValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3f3f46',
  },
  paymentMethodBreakdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'right',
  },
  splitsCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
    gap: 8,
  },
  splitsCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  splitsCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  splitsCountPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  splitDetailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  splitDetailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  splitDetailName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
  },
  splitDetailAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#18181B',
    fontVariant: ['tabular-nums'],
  },
  splitsCardFooter: {
    marginTop: 8,
    gap: 3,
  },
  splitLine: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52525B',
  },
  splitHeaderBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  splitHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  previewLeftWrap: {
    gap: 10,
  },
  slipTabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  slipTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  slipTabActive: {
    backgroundColor: '#F97316',
  },
  slipTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#52525B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  slipTabTextActive: {
    color: '#FFFFFF',
  },
  previewSlipHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  giftCardValue: {
    color: '#7c3aed',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  printButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#f97316',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  receiptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  kotBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kotBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#27272a',
  },
  barBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  barBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#27272a',
  },
  closeBtn: {
    height: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3f3f46',
  },
  btnPressed: {
    opacity: 0.8,
  },
  previewRightScroll: {
    flex: 1,
  },
  previewRightContent: {
    gap: 12,
    paddingVertical: 2,
  },
  previewModeHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  previewModeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 6,
  },
  previewModeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2410c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewOrderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18181b',
  },
  previewMetaCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewMetaLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  previewMetaValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '700',
  },
  previewTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f97316',
  },
  printingBanner: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fdba74',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  printingBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  printingBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#c2410c',
  },
  printingBannerSubtitle: {
    fontSize: 12,
    color: '#9a3412',
    fontWeight: '500',
    lineHeight: 16,
  },
  printJobStripCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
    flex: 1,
  },
  readyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readyCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyCardTextWrap: {
    flex: 1,
  },
  readyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  readyCardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
});
