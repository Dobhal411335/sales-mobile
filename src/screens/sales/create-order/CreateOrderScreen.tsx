import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Cart} from '../../../components/cart/Cart';
import {TabletModal} from '../../../components/common/TabletModal';
import {LayoutGrid, List} from 'lucide-react-native';
import {HeadList} from '../../../components/menu/HeadList';
import {MenuListFilters} from '../../../components/menu/MenuListFilters';
import {ModifierModal} from '../../../components/menu/ModifierModal';
import {OfferOptionsModal} from '../../../components/menu/OfferOptionsModal';
import {ProductGrid} from '../../../components/menu/ProductGrid';
import {
  PartyNameForm,
  validatePartyNameForm,
} from '../../../components/orders/PartyNameForm';
import {StaffPartyForm} from '../../../components/orders/StaffPartyForm';
import {ReceiptPreview} from '../../../components/payment/ReceiptPreview';
import {PrintJobStatusStrip} from '../../../components/printing/PrintJobStatusStrip';
import {colors} from '../../../constants/colors';
import {toast} from '../../../components/common/Toast';
import {useAuth} from '../../../hooks/useAuth';
import {useMenuData} from '../../../hooks/useMenuData';
import {useOrderContextDisplay} from '../../../hooks/useOrderContext';
import {
  useOrderRealtime,
  useOrderStoreSelectors,
} from '../../../hooks/useOrderRealtime';
import {useOrderSession} from '../../../hooks/useOrderSession';
import {
  getStaffEmployeeName,
  useStaffEmployees,
} from '../../../hooks/useStaffEmployees';
import type {SalesStackParamList} from '../../../navigation/types';
import {reprintTicket} from '../../../services/printJobService';
import {
  buildSubmitPayloadFromCart,
  submitOrder,
  toReceiptOrder,
} from '../../../services/orderService';
import {useCartStore} from '../../../store/cartStore';
import {useOrderStore} from '../../../store/orderStore';
import type {MenuProduct} from '../../../types/product';
import type {KotLineItem, ReceiptOrder} from '../../../types/receipt';
import {productNeedsOptions} from '../../../types/product';
import {
  buildOfferCartLine,
  buildSimpleCartLine,
} from '../../../utils/cartBuilder';
import {isStaffRole} from '../../../utils/floorRoles';
import {offerNeedsOptions} from '../../../utils/offerDetails';
import {resolvePartyName} from '../../../utils/partyName';

type Props = NativeStackScreenProps<SalesStackParamList, 'CreateOrder'>;

export function CreateOrderScreen({navigation, route}: Props) {
  const {user: currentUser} = useAuth();
  const {orderType, tableId, sessionId} = route.params ?? {};

  const {refetchOrder, persistDirectOrderId} = useOrderSession({
    orderType,
    tableId,
    sessionId,
  });

  const {
    loading: sessionLoading,
    error: sessionError,
    dirty,
    remoteUpdatePending,
    orderContext,
  } = useOrderStoreSelectors();

  const setDirty = useOrderStore((state) => state.setDirty);
  const setSaving = useOrderStore((state) => state.setSaving);
  const setRemoteUpdatePending = useOrderStore(
    (state) => state.setRemoteUpdatePending,
  );

  const {employees} = useStaffEmployees();

  useOrderRealtime(orderContext?.floorId, refetchOrder);

  const {
    categories,
    heads,
    activeCategory,
    activeHead,
    viewMode,
    searchQuery,
    filteredProducts,
    globalTaxes,
    loading: menuLoading,
    error: menuError,
    setActiveCategory,
    setActiveHead,
    setViewMode,
    setSearchQuery,
  } = useMenuData();

  const items = useCartStore((state) => state.items);
  const orderNote = useCartStore((state) => state.orderNote);
  const orderNumber = useCartStore((state) => state.orderNumber);
  const hasSentKot = useCartStore((state) => state.hasSentKot);
  const activeOrderId = useCartStore((state) => state.activeOrderId);
  const guestName = useCartStore((state) => state.guestName);
  const guestPhone = useCartStore((state) => state.guestPhone);
  const guestCountryCode = useCartStore((state) => state.guestCountryCode);
  const guestEmail = useCartStore((state) => state.guestEmail);
  const partyName = useCartStore((state) => state.partyName);
  const staffForId = useCartStore((state) => state.staffForId);
  const staffOrderReason = useCartStore((state) => state.staffOrderReason);
  const kotPayload = useCartStore((state) => state.kotPayload);
  const serverName = useCartStore((state) => state.serverName);
  const isSubmitting = useCartStore((state) => state.isSubmitting);
  const appliedDiscount = useCartStore((state) => state.appliedDiscount);

  const addItems = useCartStore((state) => state.addItems);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const setOrderNote = useCartStore((state) => state.setOrderNote);
  const clearCart = useCartStore((state) => state.clearCart);
  const setPartyFields = useCartStore((state) => state.setPartyFields);
  const setIsSubmitting = useCartStore((state) => state.setIsSubmitting);
  const applyKotResult = useCartStore((state) => state.applyKotResult);
  const getTotals = useCartStore((state) => state.getTotals);
  const canPay = useCartStore((state) => state.canPay);
  const canSendKot = useCartStore((state) => state.canSendKot);

  const [modifierProduct, setModifierProduct] = useState<MenuProduct | null>(
    null,
  );
  const [modifierOpen, setModifierOpen] = useState(false);
  const [offerProduct, setOfferProduct] = useState<MenuProduct | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [kotPreviewOpen, setKotPreviewOpen] = useState(false);
  const [kotReceiptOrder, setKotReceiptOrder] = useState<ReceiptOrder | null>(
    null,
  );
  const [ticketPrintJobId, setTicketPrintJobId] = useState<string | null>(null);
  const [activePreviewMode, setActivePreviewMode] = useState<'kot' | 'bar'>('kot');
  const [isReprint, setIsReprint] = useState(false);
  const [reprinting, setReprinting] = useState(false);

  const display = useOrderContextDisplay(orderNumber);

  const markDirty = useCallback(() => {
    if (!dirty) {
      setDirty(true);
    }
  }, [dirty, setDirty]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!useOrderStore.getState().dirty) {
        return;
      }

      event.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved cart changes. Leave without saving?',
        [
          {text: 'Stay', style: 'cancel'},
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              useOrderStore.getState().setDirty(false);
              navigation.dispatch(event.data.action);
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation]);

  const isWalkIn = orderType === 'walking';
  const isStaffOrder = orderType === 'staff';

  const tableLabel = useMemo(
    () =>
      display.tableNumber && display.floorName
        ? `Table ${display.tableNumber} · ${display.floorName}`
        : display.tableNumber
          ? `Table ${display.tableNumber}`
          : '',
    [display.tableNumber, display.floorName],
  );

  const handleProductPress = useCallback(
    (product: MenuProduct) => {
      if (product.isOffer) {
        if (offerNeedsOptions(product)) {
          setOfferProduct(product);
          setOfferOpen(true);
          return;
        }
        markDirty();
        addItems([buildOfferCartLine(product, {}, globalTaxes)]);
        return;
      }

      if (productNeedsOptions(product)) {
        setModifierProduct(product);
        setModifierOpen(true);
        return;
      }
      markDirty();
      addItems([buildSimpleCartLine(product, globalTaxes)]);
    },
    [addItems, globalTaxes, markDirty],
  );

  const handleSendKot = useCallback(() => {
    if (!canSendKot()) {
      return;
    }
    if (isStaffOrder) {
      setStaffModalOpen(true);
    } else {
      setPartyModalOpen(true);
    }
  }, [canSendKot, isStaffOrder]);

  const submitKotOrder = useCallback(
    async (
      resolvedPartyName: string,
      extras: {
        staffForId?: string;
        staffOrderReason?: string;
        source?: string;
      } = {},
    ) => {
      setIsSubmitting(true);
      setSaving(true);
      try {
        const payload = buildSubmitPayloadFromCart(
          items,
          globalTaxes,
          appliedDiscount,
          orderNote,
          {
            sessionId: sessionId ?? null,
            orderId: activeOrderId ?? undefined,
            tableNo: orderContext?.tableNumber,
            floorName: orderContext?.floorName,
            guestName: guestName.trim() || undefined,
            partyName: resolvedPartyName,
            contactNumber: guestPhone.trim() || null,
            guestCountryCode: guestPhone.trim() ? guestCountryCode : null,
            guestEmail: guestEmail.trim() || null,
            guestCount: orderContext?.guestCount ?? null,
            orderType,
            source: extras.source ?? orderContext?.source,
            staffForId: extras.staffForId,
            staffOrderReason: extras.staffOrderReason ?? null,
          },
        );

        const result = await submitOrder(payload);
        if (!result.success || !result.data) {
          Alert.alert('Unable to send order', result.message ?? 'Try again.');
          setPartyModalOpen(false);
          setStaffModalOpen(false);
          return;
        }

        // Close modal immediately so UI feels instant
        setPartyModalOpen(false);
        setStaffModalOpen(false);

        const receiptOrder = toReceiptOrder(result.data);
        setPartyFields({
          partyName: resolvedPartyName,
        });
        applyKotResult({
          orderNumber: result.data.orderNumber,
          orderId: result.data._id,
          kotPayload: result.data.kotPayload,
          ticketType: result.data.ticketType,
          items: result.data.items,
          persistedTotals: {
            subtotal: result.data.subTotal,
            taxTotal: result.data.taxTotal,
            discountTotal: result.data.discountTotal,
            total: result.data.totalAmount,
          },
          serverName: result.data.processedByName,
          partyName: resolvedPartyName,
        });

        if (result.data._id && (orderType === 'walking' || orderType === 'staff')) {
          await persistDirectOrderId(result.data._id);
        }

        setDirty(false);
        setRemoteUpdatePending(false);

        const ticketType = result.data.ticketType || 'KOT';
        const isBarTicket = ticketType === 'BAR_RECEIPT';
        toast.success(
          isBarTicket ? 'Bar ticket created!' : 'Order sent to kitchen!',
        );

        if (
          receiptOrder &&
          ((result.data.kotPayload && result.data.kotPayload.length > 0) ||
            (result.data.items && result.data.items.length > 0))
        ) {
          setTicketPrintJobId(result.data.printJobId ?? null);
          setKotReceiptOrder(receiptOrder);
          setActivePreviewMode(isBarTicket ? 'bar' : 'kot');
          setIsReprint(false);
          // Let the success toast show before the KOT preview modal covers it
          setTimeout(() => {
            setKotPreviewOpen(true);
          }, 700);
        }
      } catch {
        Alert.alert(
          'Unable to send order',
          'Check your connection and try again.',
        );
        setPartyModalOpen(false);
        setStaffModalOpen(false);
      } finally {
        setIsSubmitting(false);
        setSaving(false);
      }
    },
    [
      activeOrderId,
      appliedDiscount,
      applyKotResult,
      globalTaxes,
      guestCountryCode,
      guestEmail,
      guestName,
      guestPhone,
      items,
      orderContext?.floorName,
      orderContext?.guestCount,
      orderContext?.source,
      orderContext?.tableNumber,
      orderNote,
      orderType,
      persistDirectOrderId,
      sessionId,
      setDirty,
      setIsSubmitting,
      setPartyFields,
      setRemoteUpdatePending,
      setSaving,
    ],
  );

  const handleConfirmParty = useCallback(() => {
    const validationError = validatePartyNameForm(guestEmail, guestPhone);
    if (validationError) {
      Alert.alert('Invalid information', validationError);
      return;
    }

    const resolved = resolvePartyName(undefined, guestName, {
      isWalkIn,
      orderType,
      tableLabel,
      guestCount: orderContext?.guestCount,
    });

    const source = isWalkIn ? 'WALK_IN' : orderContext?.source;
    submitKotOrder(resolved, {source});
  }, [
    guestEmail,
    guestPhone,
    guestName,
    isWalkIn,
    orderType,
    tableLabel,
    orderContext?.guestCount,
    orderContext?.source,
    submitKotOrder,
  ]);

  const handleConfirmStaff = useCallback(() => {
    if (!staffForId) {
      Alert.alert('Select employee', 'Please select a staff member.');
      return;
    }
    const resolved = getStaffEmployeeName(employees, staffForId);
    submitKotOrder(resolved, {
      staffForId,
      staffOrderReason: staffOrderReason.trim() || undefined,
      source: 'STAFF',
    });
  }, [employees, staffForId, staffOrderReason, submitKotOrder]);

  const handlePayNow = useCallback(() => {
    if (isStaffRole(currentUser?.role)) {
      toast.error('Payments must be completed at the main counter.');
      Alert.alert(
        'Main Counter Payment',
        'Staff members cannot process payment directly at the table. Please complete this payment at the main counter.',
        [
          {text: 'Stay Here', style: 'cancel'},
          {
            text: 'Go to Orders',
            onPress: () => navigation.navigate('Orders'),
          },
        ],
      );
      return;
    }

    if (!hasSentKot) {
      toast.error('Send the order to kitchen (KOT) before taking payment.');
      return;
    }

    const totals = getTotals();
    navigation.navigate('Payment', {
      sessionId,
      orderId: activeOrderId ?? undefined,
      orderNumber: orderNumber ?? undefined,
      orderType,
      tableId,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      partyName: partyName || guestName,
      guestCount: orderContext?.guestCount,
      tableNumber: orderContext?.tableNumber,
      floorName: orderContext?.floorName,
    });
  }, [
    currentUser?.role,
    hasSentKot,
    activeOrderId,
    getTotals,
    guestName,
    navigation,
    orderContext?.floorName,
    orderContext?.guestCount,
    orderContext?.tableNumber,
    orderType,
    orderNumber,
    partyName,
    sessionId,
    tableId,
  ]);

  const resolvedKotItems = useMemo(() => {
    if (kotPayload && kotPayload.length > 0) {
      return kotPayload;
    }
    return (kotReceiptOrder?.items || []) as unknown as KotLineItem[];
  }, [kotPayload, kotReceiptOrder]);

  const handleReprintTicket = useCallback(async () => {
    const orderId = kotReceiptOrder?.orderId || activeOrderId;
    if (!orderId && !ticketPrintJobId) {
      toast.error('No order ID found to reprint');
      return;
    }
    setReprinting(true);
    try {
      const printType = activePreviewMode === 'bar' ? 'BAR_RECEIPT' : 'KOT';
      const res = await reprintTicket({
        orderId: orderId || undefined,
        jobId: ticketPrintJobId ?? undefined,
        printType,
        kotItems: resolvedKotItems,
        guestCount: orderContext?.guestCount,
        serverName: serverName ?? undefined,
        specialNote: orderNote,
      });
      if (res.success) {
        setIsReprint(true);
        if (res.data?.job?._id) {
          setTicketPrintJobId(res.data.job._id);
        }
        toast.success(
          activePreviewMode === 'bar'
            ? 'Bar ticket reprint queued'
            : 'KOT reprint queued',
        );
      } else {
        toast.error(res.message || 'Failed to queue reprint');
      }
    } catch {
      toast.error('Network error reprinting ticket');
    } finally {
      setReprinting(false);
    }
  }, [
    kotReceiptOrder?.orderId,
    activeOrderId,
    ticketPrintJobId,
    activePreviewMode,
    resolvedKotItems,
    orderContext?.guestCount,
    serverName,
    orderNote,
  ]);

  const handleViewPrintJob = useCallback(
    (jobId: string) => {
      setKotPreviewOpen(false);
      navigation.navigate('PrintJobs', {jobId});
    },
    [navigation],
  );

  const handleRefreshRemote = useCallback(() => {
    setRemoteUpdatePending(false);
    refetchOrder();
  }, [refetchOrder, setRemoteUpdatePending]);

  const totals = getTotals();
  const kotModalTitle =
    activePreviewMode === 'bar' ? 'Bar Receipt' : 'Kitchen Order Ticket (KOT)';

  const showSessionLoader = sessionLoading && items.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {remoteUpdatePending ? (
        <Pressable
          style={styles.remoteBanner}
          onPress={handleRefreshRemote}
          accessibilityRole="button"
          accessibilityLabel="Refresh order">
          <Text style={styles.remoteBannerText}>
            Order updated on another device. Tap to refresh.
          </Text>
        </Pressable>
      ) : null}

      {sessionError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{sessionError}</Text>
        </View>
      ) : null}

      <View style={styles.layout}>
        <View style={styles.menuPane}>
          <View style={styles.contextHeader}>
            <View style={styles.contextHeaderText}>
              <Text style={styles.screenTitle}>{display.headerTitle}</Text>
              <Text style={styles.contextSubtitle}>{display.partyLabel}</Text>
            </View>
            <View style={styles.viewToggle}>
              <Pressable
                style={[
                  styles.viewToggleBtn,
                  viewMode === 'grid' && styles.viewToggleBtnActive,
                ]}
                onPress={() => setViewMode('grid')}
                accessibilityRole="button"
                accessibilityState={{selected: viewMode === 'grid'}}
                accessibilityLabel="Grid view">
                <LayoutGrid
                  size={16}
                  color={viewMode === 'grid' ? colors.text : colors.textSecondary}
                />
              </Pressable>
              <Pressable
                style={[
                  styles.viewToggleBtn,
                  viewMode === 'list' && styles.viewToggleBtnActive,
                ]}
                onPress={() => setViewMode('list')}
                accessibilityRole="button"
                accessibilityState={{selected: viewMode === 'list'}}
                accessibilityLabel="List view">
                <List
                  size={16}
                  color={viewMode === 'list' ? colors.text : colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          {viewMode === 'grid' ? (
            <HeadList
              heads={heads}
              activeHead={activeHead}
              onSelectHead={setActiveHead}
            />
          ) : (
            <MenuListFilters
              categories={categories}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              onChangeSearch={setSearchQuery}
              onSelectCategory={setActiveCategory}
            />
          )}

          {showSessionLoader ? (
            <View style={styles.loaderPane}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Loading order...</Text>
            </View>
          ) : (
            <ProductGrid
              products={filteredProducts}
              loading={menuLoading}
              error={menuError}
              onProductPress={handleProductPress}
            />
          )}
        </View>

        <View style={styles.cartPane}>
          <Cart
            items={items}
            orderNote={orderNote}
            orderNumber={orderNumber}
            totals={totals}
            canSendKot={canSendKot()}
            canPay={canPay()}
            hasSentKot={hasSentKot}
            onChangeNote={(note) => {
              markDirty();
              setOrderNote(note);
            }}
            onIncrease={(cartId) => {
              const item = items.find((line) => line.cartId === cartId);
              if (item) {
                markDirty();
                updateQty(cartId, item.qty + 1);
              }
            }}
            onDecrease={(cartId) => {
              const item = items.find((line) => line.cartId === cartId);
              if (item) {
                markDirty();
                updateQty(cartId, item.qty - 1);
              }
            }}
            onRemove={(cartId) => {
              markDirty();
              removeItem(cartId);
            }}
            onClearAll={() => {
              markDirty();
              clearCart();
            }}
            onSendKot={handleSendKot}
            onPayNow={handlePayNow}
          />
        </View>
      </View>

      <ModifierModal
        visible={modifierOpen}
        product={modifierProduct}
        globalTaxes={globalTaxes}
        onClose={() => {
          setModifierOpen(false);
          setModifierProduct(null);
        }}
        onAdd={(lines) => {
          markDirty();
          addItems(lines);
        }}
      />

      <OfferOptionsModal
        visible={offerOpen}
        offer={offerProduct}
        globalTaxes={globalTaxes}
        onClose={() => {
          setOfferOpen(false);
          setOfferProduct(null);
        }}
        onAdd={(lines) => {
          markDirty();
          addItems(lines);
        }}
      />

      <TabletModal
        visible={partyModalOpen}
        title={isWalkIn ? 'Bill under whose name?' : 'Party Name'}
        onClose={() => setPartyModalOpen(false)}
        maxWidth={480}
        footerActions={[
          {
            label: 'Cancel',
            variant: 'destructive',
            onPress: () => setPartyModalOpen(false),
          },
          {
            label: 'Confirm & Send',
            loadingLabel: 'Sending KOT...',
            variant: 'primary',
            onPress: handleConfirmParty,
            disabled: isSubmitting,
            loading: isSubmitting,
          },
        ]}>
        <PartyNameForm
          guestName={guestName}
          guestPhone={guestPhone}
          guestCountryCode={guestCountryCode}
          guestEmail={guestEmail}
          onChangeGuestName={(value) => {
            markDirty();
            setPartyFields({guestName: value});
          }}
          onChangeGuestPhone={(value) => {
            markDirty();
            setPartyFields({guestPhone: value});
          }}
          onChangeGuestCountryCode={(value) => {
            markDirty();
            setPartyFields({guestCountryCode: value});
          }}
          onChangeGuestEmail={(value) => {
            markDirty();
            setPartyFields({guestEmail: value});
          }}
          tableNumber={orderContext?.tableNumber}
          floorName={orderContext?.floorName}
          guestCount={orderContext?.guestCount}
        />
      </TabletModal>

      <TabletModal
        visible={staffModalOpen}
        title="Staff Order"
        onClose={() => setStaffModalOpen(false)}
        maxWidth={420}
        footerActions={[
          {
            label: 'Cancel',
            variant: 'destructive',
            onPress: () => setStaffModalOpen(false),
          },
          {
            label: 'Confirm & Send',
            loadingLabel: 'Sending KOT...',
            variant: 'primary',
            onPress: handleConfirmStaff,
            disabled: isSubmitting || !staffForId,
            loading: isSubmitting,
          },
        ]}>
        <StaffPartyForm
          selectedStaffId={staffForId}
          staffOrderReason={staffOrderReason}
          onStaffChange={(id) => {
            markDirty();
            setPartyFields({staffForId: id});
          }}
          onReasonChange={(reason) => {
            markDirty();
            setPartyFields({staffOrderReason: reason});
          }}
        />
      </TabletModal>

      <TabletModal
        visible={kotPreviewOpen}
        title={kotModalTitle}
        onClose={() => setKotPreviewOpen(false)}
        maxWidth={920}
        splitContent={
          kotReceiptOrder
            ? {
                left: (
                  <ReceiptPreview
                    mode={activePreviewMode}
                    order={kotReceiptOrder}
                    kotItems={
                      activePreviewMode === 'kot' ? resolvedKotItems : undefined
                    }
                    barItems={
                      activePreviewMode === 'bar' ? resolvedKotItems : undefined
                    }
                    serverName={serverName ?? undefined}
                    guestCount={orderContext?.guestCount}
                    specialNote={orderNote}
                    isReprint={isReprint}
                  />
                ),
                right: (
                  <View style={styles.kotActions}>
                    <Text style={styles.kotActionsTitle}>
                      {activePreviewMode === 'bar'
                        ? 'BAR ACTIONS'
                        : 'KOT ACTIONS'}
                    </Text>

                    {orderContext?.tableNumber ? (
                      <Text style={styles.kotMeta}>
                        Table {orderContext.tableNumber}
                      </Text>
                    ) : null}
                    {orderNumber ? (
                      <Text style={styles.kotMeta}>Order #{orderNumber}</Text>
                    ) : null}
                    {serverName ? (
                      <Text style={styles.kotMeta}>Server: {serverName}</Text>
                    ) : null}
                    {partyName ? (
                      <Text style={styles.kotMeta}>Party: {partyName}</Text>
                    ) : null}

                    <PrintJobStatusStrip
                      printJobId={ticketPrintJobId}
                      label={
                        activePreviewMode === 'bar'
                          ? 'Bar ticket print job'
                          : 'KOT print job'
                      }
                      printingText={
                        activePreviewMode === 'bar'
                          ? 'Bar ticket is printing...'
                          : 'KOT is printing...'
                      }
                      onViewJob={handleViewPrintJob}
                    />

                    <Pressable
                      style={styles.kotActionPrimary}
                      onPress={() => {
                        setKotPreviewOpen(false);
                        if (orderType === 'table') {
                          navigation.navigate('Floor');
                        } else {
                          navigation.navigate('Orders');
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        orderType === 'table'
                          ? 'Done & Back to Floor'
                          : 'Done & Go to Orders'
                      }>
                      <Text style={styles.kotActionPrimaryText}>
                        {orderType === 'table'
                          ? 'Done & Back to Floor'
                          : 'Done & Go to Orders'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.kotReprintButton,
                        reprinting && styles.buttonDisabled,
                      ]}
                      onPress={handleReprintTicket}
                      disabled={reprinting}
                      accessibilityRole="button"
                      accessibilityLabel="Reprint Ticket">
                      {reprinting ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.kotReprintButtonText}>
                          {isReprint
                            ? `Reprint ${activePreviewMode === 'bar' ? 'Bar Ticket' : 'KOT'} Again`
                            : `Reprint ${activePreviewMode === 'bar' ? 'Bar Ticket' : 'KOT'}`}
                        </Text>
                      )}
                    </Pressable>

                    <Pressable
                      style={styles.kotActionSecondary}
                      onPress={() => setKotPreviewOpen(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Stay on Order">
                      <Text style={styles.kotActionSecondaryText}>Stay on Order</Text>
                    </Pressable>
                  </View>
                ),
              }
            : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  menuPane: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background,
  },
  cartPane: {
    flex: 0.38,
    minWidth: 320,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  contextHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  contextSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F4F4F5',
    padding: 4,
    borderRadius: 10,
  },
  viewToggleBtn: {
    width: 36,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  loaderPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  remoteBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  remoteBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'center',
  },
  kotActions: {
    gap: 12,
  },
  kotActionsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kotMeta: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  kotActionPrimary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  kotActionPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  kotReprintButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  kotReprintButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  kotActionSecondary: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kotActionSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
