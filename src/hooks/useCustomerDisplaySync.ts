import {useEffect, useRef, useSyncExternalStore} from 'react';
import {
  clearCustomerDisplay,
  formatMoneyForDisplay,
  isCustomerDisplayModuleReady,
  showCustomerDisplay,
} from '../display/customerDisplay';
import {
  getCustomerDisplaySettings,
  hydrateCustomerDisplaySettings,
  subscribeCustomerDisplaySettings,
} from '../display/customerDisplaySettings';
import {useCartStore} from '../store/cartStore';
import {config} from '../constants/config';

/**
 * Keeps the POS tablet's customer-facing secondary screen in sync with the cart.
 * Defers native updates via rAF so cart UI paint wins over display I/O.
 */
export function useCustomerDisplaySync(enabled = true) {
  const items = useCartStore((s) => s.items);
  const getTotals = useCartStore((s) => s.getTotals);
  const orderStatus = useCartStore((s) => s.orderStatus);
  const settings = useSyncExternalStore(
    subscribeCustomerDisplaySettings,
    getCustomerDisplaySettings,
    getCustomerDisplaySettings,
  );
  const lastKey = useRef<string>('');
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    void hydrateCustomerDisplaySettings();
  }, []);

  useEffect(() => {
    if (!enabled || !isCustomerDisplayModuleReady()) return;
    if (!settings.enabled) {
      void clearCustomerDisplay();
      lastKey.current = '';
      return;
    }

    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const totals = getTotals();
      const lines = settings.showLineItems
        ? (items || [])
            .filter((item) => Number(item.qty) > 0)
            .slice(0, 12)
            .map((item) => ({
              name: String(item.name || 'Item'),
              qty: Number(item.qty) || 1,
              priceText: formatMoneyForDisplay(
                (Number(item.price) || 0) * (Number(item.qty) || 1),
              ),
            }))
        : [];

      const paid = String(orderStatus || '').toUpperCase() === 'PAID';
      const brand = settings.brand.trim() || config.APP_NAME.toUpperCase();
      const key = JSON.stringify({
        total: totals.total,
        paid,
        brand,
        showLineItems: settings.showLineItems,
        cartFooter: settings.cartFooter,
        paidFooter: settings.paidFooter,
        lines: lines.map((l) => `${l.qty}:${l.name}:${l.priceText}`),
      });
      if (key === lastKey.current) return;
      lastKey.current = key;

      if (!lines.length && !paid && !(items || []).some((i) => Number(i.qty) > 0)) {
        void clearCustomerDisplay();
        return;
      }

      const hasItems = (items || []).some((i) => Number(i.qty) > 0);
      if (!hasItems && !paid) {
        void clearCustomerDisplay();
        return;
      }

      void showCustomerDisplay({
        brand,
        title: paid ? 'Payment received' : 'Your order',
        totalLabel: paid ? 'PAID' : 'TOTAL',
        totalText: formatMoneyForDisplay(totals.total),
        footer: paid ? settings.paidFooter : settings.cartFooter,
        mode: paid ? 'paid' : 'cart',
        lines,
      });
    });

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [enabled, getTotals, items, orderStatus, settings]);
}
