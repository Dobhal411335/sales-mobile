import {useEffect, useRef} from 'react';
import {
  clearCustomerDisplay,
  formatMoneyForDisplay,
  isCustomerDisplayModuleReady,
  showCustomerDisplay,
} from '../display/customerDisplay';
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
  const lastKey = useRef<string>('');
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !isCustomerDisplayModuleReady()) return;

    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const totals = getTotals();
      const lines = (items || [])
        .filter((item) => Number(item.qty) > 0)
        .slice(0, 12)
        .map((item) => ({
          name: String(item.name || 'Item'),
          qty: Number(item.qty) || 1,
          priceText: formatMoneyForDisplay(
            (Number(item.price) || 0) * (Number(item.qty) || 1),
          ),
        }));

      const paid = String(orderStatus || '').toUpperCase() === 'PAID';
      const key = JSON.stringify({
        total: totals.total,
        paid,
        lines: lines.map((l) => `${l.qty}:${l.name}:${l.priceText}`),
      });
      if (key === lastKey.current) return;
      lastKey.current = key;

      if (!lines.length && !paid) {
        void clearCustomerDisplay();
        return;
      }

      void showCustomerDisplay({
        brand: config.APP_NAME.toUpperCase(),
        title: paid ? 'Payment received' : 'Your order',
        totalLabel: paid ? 'PAID' : 'TOTAL',
        totalText: formatMoneyForDisplay(totals.total),
        footer: paid ? 'Thank you — please come again' : 'Thank you',
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
  }, [enabled, getTotals, items, orderStatus]);
}
