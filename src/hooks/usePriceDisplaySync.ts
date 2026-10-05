import {useEffect, useRef} from 'react';
import {
  clearPriceDisplay,
  hydratePriceDisplaySettings,
  isPriceDisplayModuleReady,
  showPriceDisplayAmount,
} from '../display/priceDisplay';
import {useCartStore} from '../store/cartStore';

/**
 * Pushes the live bill total to the serial customer price LED (客显)
 * while Sales is open — especially useful on Payment / bill clearance.
 */
export function usePriceDisplaySync(enabled = true) {
  const items = useCartStore((s) => s.items);
  const getTotals = useCartStore((s) => s.getTotals);
  const orderStatus = useCartStore((s) => s.orderStatus);
  const lastKey = useRef<string>('');
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    void hydratePriceDisplaySettings();
  }, []);

  useEffect(() => {
    if (!enabled || !isPriceDisplayModuleReady()) return;

    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const totals = getTotals();
      const hasItems = (items || []).some((i) => Number(i.qty) > 0);
      const paid = String(orderStatus || '').toUpperCase() === 'PAID';
      const key = `${totals.total}|${paid}|${hasItems}`;
      if (key === lastKey.current) return;
      lastKey.current = key;

      if (!hasItems && !paid) {
        void clearPriceDisplay();
        return;
      }

      void showPriceDisplayAmount(totals.total, paid ? 'collect' : 'total');
    });

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [enabled, getTotals, items, orderStatus]);
}
