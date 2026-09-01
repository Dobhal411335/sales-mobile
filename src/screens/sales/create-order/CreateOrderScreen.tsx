import React, {useCallback, useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {Cart} from '../../../components/cart/Cart';
import {TabletModal} from '../../../components/common/TabletModal';
import {CategoryList} from '../../../components/menu/CategoryList';
import {ModifierModal} from '../../../components/menu/ModifierModal';
import {ProductGrid} from '../../../components/menu/ProductGrid';
import {
  PartyNameForm,
  validatePartyNameForm,
} from '../../../components/orders/PartyNameForm';
import {
  getStaffPartyName,
  StaffPartyForm,
} from '../../../components/orders/StaffPartyForm';
import {ReceiptPreview} from '../../../components/payment/ReceiptPreview';
import {colors} from '../../../constants/colors';
import {useMenuData} from '../../../hooks/useMenuData';
import {useOrderContext} from '../../../hooks/useOrderContext';
import type {SalesStackParamList} from '../../../navigation/types';
import {printerService} from '../../../printer/printerService';
import {
  buildSubmitPayloadFromCart,
  submitOrderMock,
  toReceiptOrder,
} from '../../../services/orderService';
import {useCartStore} from '../../../store/cartStore';
import {useOrderStore} from '../../../store/orderStore';
import type {MenuProduct} from '../../../types/product';
import type {ReceiptOrder} from '../../../types/receipt';
import {productNeedsOptions} from '../../../types/product';
import {buildSimpleCartLine} from '../../../utils/cartBuilder';
import {resolvePartyName} from '../../../utils/partyName';

type Props = NativeStackScreenProps<SalesStackParamList, 'CreateOrder'>;

export function CreateOrderScreen({navigation, route}: Props) {
  const {orderType, tableId, sessionId} = route.params ?? {};
  const orderContext = useOrderContext({orderType, tableId, sessionId});
  const setOrderContext = useOrderStore((state) => state.setOrderContext);

  const {
    categories,
    activeCategory,
    filteredProducts,
    globalTaxes,
    loading,
    error,
    setActiveCategory,
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
  const ticketType = useCartStore((state) => state.ticketType);
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
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [kotPreviewOpen, setKotPreviewOpen] = useState(false);
  const [kotReceiptOrder, setKotReceiptOrder] = useState<ReceiptOrder | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      setOrderContext(orderContext);
      return () => {
        setOrderContext(null);
      };
    }, [orderContext, setOrderContext]),
  );

  const isWalkIn = orderType === 'walking';
  const isStaffOrder = orderType === 'staff';

  const tableLabel = useMemo(
    () =>
      orderContext.tableNumber && orderContext.floorName
        ? `Table ${orderContext.tableNumber} · ${orderContext.floorName}`
        : orderContext.tableNumber
          ? `Table ${orderContext.tableNumber}`
          : '',
    [orderContext.tableNumber, orderContext.floorName],
  );

  const handleProductPress = useCallback(
    (product: MenuProduct) => {
      if (productNeedsOptions(product)) {
        setModifierProduct(product);
        setModifierOpen(true);
        return;
      }
      addItems([buildSimpleCartLine(product, globalTaxes)]);
    },
    [addItems, globalTaxes],
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
    async (resolvedPartyName: string, extras: {
      staffForId?: string;
      staffOrderReason?: string;
      source?: string;
    } = {}) => {
      setIsSubmitting(true);
      try {
        const payload = buildSubmitPayloadFromCart(
          items,
          globalTaxes,
          appliedDiscount,
          orderNote,
          {
            sessionId: sessionId ?? null,
            orderId: activeOrderId ?? undefined,
            tableNo: orderContext.tableNumber,
            floorName: orderContext.floorName,
            guestName: resolvedPartyName,
            partyName: resolvedPartyName,
            contactNumber: guestPhone.trim() || null,
            guestCountryCode: guestPhone.trim() ? guestCountryCode : null,
            guestEmail: guestEmail.trim() || null,
            guestCount: orderContext.guestCount ?? null,
            orderType,
            source: extras.source,
            staffForId: extras.staffForId,
            staffOrderReason: extras.staffOrderReason ?? null,
          },
        );

        const result = await submitOrderMock(payload);
        if (!result.success || !result.data) {
          Alert.alert('Unable to send order', result.message ?? 'Try again.');
          return;
        }

        const receiptOrder = toReceiptOrder(result.data);
        setPartyFields({
          partyName: resolvedPartyName,
          guestName: resolvedPartyName,
        });
        applyKotResult({
          orderNumber: result.data.orderNumber,
          orderId: result.data._id,
          kotPayload: result.data.kotPayload,
          ticketType: result.data.ticketType,
          persistedTotals: {
            subtotal: result.data.subTotal,
            taxTotal: result.data.taxTotal,
            discountTotal: result.data.discountTotal,
            total: result.data.totalAmount,
          },
          serverName: result.data.processedByName,
          partyName: resolvedPartyName,
        });

        if (receiptOrder && result.data.kotPayload.length > 0) {
          setKotReceiptOrder(receiptOrder);
          setKotPreviewOpen(true);
        }
      } catch {
        Alert.alert('Unable to send order', 'Check your connection and try again.');
      } finally {
        setIsSubmitting(false);
        setPartyModalOpen(false);
        setStaffModalOpen(false);
      }
    },
    [
      activeOrderId,
      appliedDiscount,
      applyKotResult,
      globalTaxes,
      guestCountryCode,
      guestEmail,
      guestPhone,
      items,
      orderContext.floorName,
      orderContext.guestCount,
      orderContext.tableNumber,
      orderNote,
      orderType,
      sessionId,
      setIsSubmitting,
      setPartyFields,
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
      guestCount: orderContext.guestCount,
    });

    const source = isWalkIn ? 'WALK_IN' : undefined;
    submitKotOrder(resolved, {source});
  }, [
    guestEmail,
    guestPhone,
    guestName,
    isWalkIn,
    orderType,
    tableLabel,
    orderContext.guestCount,
    submitKotOrder,
  ]);

  const handleConfirmStaff = useCallback(() => {
    if (!staffForId) {
      Alert.alert('Select employee', 'Please select a staff member.');
      return;
    }
    const resolved = getStaffPartyName(staffForId);
    submitKotOrder(resolved, {
      staffForId,
      staffOrderReason: staffOrderReason.trim() || undefined,
      source: 'STAFF',
    });
  }, [staffForId, staffOrderReason, submitKotOrder]);

  const handlePayNow = useCallback(() => {
    const totals = getTotals();
    navigation.navigate('Payment', {
      sessionId,
      orderId: activeOrderId ?? undefined,
      orderType,
      tableId,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      partyName: partyName || guestName,
      guestCount: orderContext.guestCount,
      tableNumber: orderContext.tableNumber,
      floorName: orderContext.floorName,
    });
  }, [
    activeOrderId,
    getTotals,
    guestName,
    navigation,
    orderContext.floorName,
    orderContext.guestCount,
    orderContext.tableNumber,
    orderType,
    partyName,
    sessionId,
    tableId,
  ]);

  const handlePrintKot = useCallback(async () => {
    if (!kotReceiptOrder) {
      return;
    }
    await printerService.printKOT({
      order: kotReceiptOrder,
      kotItems: kotPayload,
      ticketType,
      serverName: serverName ?? undefined,
      guestCount: orderContext.guestCount,
      specialNote: orderNote,
    });
  }, [
    kotReceiptOrder,
    kotPayload,
    ticketType,
    serverName,
    orderContext.guestCount,
    orderNote,
  ]);

  const totals = getTotals();
  const kotMode = ticketType === 'BAR_RECEIPT' ? 'bar' : 'kot';
  const kotModalTitle =
    ticketType === 'BAR_RECEIPT'
      ? 'Bar Receipt'
      : 'Kitchen Order Ticket (KOT)';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={styles.layout}>
        <View style={styles.menuPane}>
          <View style={styles.contextHeader}>
            <Text style={styles.screenTitle}>Create Order</Text>
            <Text style={styles.contextSubtitle}>{orderContext.partyLabel}</Text>
          </View>

          <CategoryList
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />

          <ProductGrid
            products={filteredProducts}
            loading={loading}
            error={error}
            onProductPress={handleProductPress}
          />
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
            onChangeNote={setOrderNote}
            onIncrease={(cartId) => {
              const item = items.find((line) => line.cartId === cartId);
              if (item) {
                updateQty(cartId, item.qty + 1);
              }
            }}
            onDecrease={(cartId) => {
              const item = items.find((line) => line.cartId === cartId);
              if (item) {
                updateQty(cartId, item.qty - 1);
              }
            }}
            onRemove={removeItem}
            onClearAll={clearCart}
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
        onAdd={(lines) => addItems(lines)}
      />

      <TabletModal
        visible={partyModalOpen}
        title={isWalkIn ? 'Bill under whose name?' : 'Party Name'}
        onClose={() => setPartyModalOpen(false)}
        footerActions={[
          {
            label: 'Cancel',
            variant: 'destructive',
            onPress: () => setPartyModalOpen(false),
          },
          {
            label: 'Confirm & Send',
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
          onChangeGuestName={(value) => setPartyFields({guestName: value})}
          onChangeGuestPhone={(value) => setPartyFields({guestPhone: value})}
          onChangeGuestCountryCode={(value) =>
            setPartyFields({guestCountryCode: value})
          }
          onChangeGuestEmail={(value) => setPartyFields({guestEmail: value})}
          tableNumber={orderContext.tableNumber}
          floorName={orderContext.floorName}
          guestCount={orderContext.guestCount}
          isWalkIn={isWalkIn}
          orderType={orderType}
        />
      </TabletModal>

      <TabletModal
        visible={staffModalOpen}
        title="Staff Order"
        onClose={() => setStaffModalOpen(false)}
        footerActions={[
          {
            label: 'Cancel',
            variant: 'destructive',
            onPress: () => setStaffModalOpen(false),
          },
          {
            label: 'Confirm & Send',
            variant: 'primary',
            onPress: handleConfirmStaff,
            disabled: isSubmitting || !staffForId,
            loading: isSubmitting,
          },
        ]}>
        <StaffPartyForm
          selectedStaffId={staffForId}
          staffOrderReason={staffOrderReason}
          onStaffChange={(id) => setPartyFields({staffForId: id})}
          onReasonChange={(reason) =>
            setPartyFields({staffOrderReason: reason})
          }
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
                    mode={kotMode}
                    order={kotReceiptOrder}
                    kotItems={kotPayload}
                    serverName={serverName ?? undefined}
                    guestCount={orderContext.guestCount}
                    specialNote={orderNote}
                  />
                ),
                right: (
                  <View style={styles.kotActions}>
                    <Text style={styles.kotActionsTitle}>KOT ACTIONS</Text>
                    {orderContext.tableNumber ? (
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

                    <Pressable
                      style={styles.kotActionButton}
                      onPress={handlePrintKot}
                      accessibilityRole="button"
                      accessibilityLabel="Print KOT">
                      <Text style={styles.kotActionPrimaryText}>Print KOT</Text>
                    </Pressable>

                    <Pressable
                      style={styles.kotActionSecondary}
                      onPress={() => setKotPreviewOpen(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Close">
                      <Text style={styles.kotActionSecondaryText}>Close</Text>
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
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
  kotActionButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  kotActionPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
  kotActionSecondary: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kotActionSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
