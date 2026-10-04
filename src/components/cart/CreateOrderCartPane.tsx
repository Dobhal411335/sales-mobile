import React, {memo, useCallback, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {Cart} from '../cart/Cart';
import {colors} from '../../constants/colors';
import {useCartStore} from '../../store/cartStore';
import {useOrderStore} from '../../store/orderStore';

interface CreateOrderCartPaneProps {
  panelLayout: '2' | '3';
  onSendKot: () => void;
  onPayNow: () => void;
  /** Manager / Master Terminal only — Staff cannot pay from Create Order. */
  canCollectPayment?: boolean;
  seatCount?: number;
  showSeatTabs?: boolean;
}

function CreateOrderCartPaneComponent({
  panelLayout,
  onSendKot,
  onPayNow,
  canCollectPayment = true,
  seatCount = 0,
  showSeatTabs = false,
}: CreateOrderCartPaneProps) {
  const items = useCartStore((s) => s.items);
  const activeSeatNumber = useCartStore((s) => s.activeSeatNumber);
  const setActiveSeatNumber = useCartStore((s) => s.setActiveSeatNumber);
  const orderNote = useCartStore((s) => s.orderNote);
  const orderNumber = useCartStore((s) => s.orderNumber);
  const hasSentKot = useCartStore((s) => s.hasSentKot);
  const updateQty = useCartStore((s) => s.updateQty);
  const updateItemNotes = useCartStore((s) => s.updateItemNotes);
  const removeItem = useCartStore((s) => s.removeItem);
  const setOrderNote = useCartStore((s) => s.setOrderNote);
  const clearCart = useCartStore((s) => s.clearCart);
  const getTotals = useCartStore((s) => s.getTotals);
  const canPay = useCartStore((s) => s.canPay);
  const canSendKot = useCartStore((s) => s.canSendKot);
  const setDirty = useOrderStore((s) => s.setDirty);

  const markDirty = useCallback(() => {
    if (!useOrderStore.getState().dirty) {
      setDirty(true);
    }
  }, [setDirty]);

  useEffect(() => {
    if (!showSeatTabs) {
      setActiveSeatNumber(null);
      return;
    }
    if (
      activeSeatNumber != null &&
      (activeSeatNumber < 1 || activeSeatNumber > seatCount)
    ) {
      setActiveSeatNumber(null);
    }
  }, [
    showSeatTabs,
    seatCount,
    activeSeatNumber,
    setActiveSeatNumber,
  ]);

  const totals = getTotals();

  return (
    <View
      style={[
        styles.cartPane,
        panelLayout === '3' ? styles.cartPaneThree : null,
      ]}>
      <Cart
        items={items}
        orderNote={orderNote}
        orderNumber={orderNumber}
        totals={totals}
        canSendKot={canSendKot()}
        canPay={canPay() && canCollectPayment}
        hasSentKot={hasSentKot}
        showSeatTabs={showSeatTabs}
        seatCount={seatCount}
        activeSeatNumber={activeSeatNumber}
        onSelectSeat={setActiveSeatNumber}
        onChangeNote={(note) => {
          markDirty();
          setOrderNote(note);
        }}
        onChangeItemNotes={(cartId, notes) => {
          markDirty();
          updateItemNotes(cartId, notes);
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
        onSendKot={onSendKot}
        onPayNow={onPayNow}
      />
    </View>
  );
}

export const CreateOrderCartPane = memo(CreateOrderCartPaneComponent);

const styles = StyleSheet.create({
  cartPane: {
    width: '34%',
    minWidth: 280,
    maxWidth: 420,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.surface,
  },
  cartPaneThree: {
    width: '30%',
    minWidth: 260,
  },
});
