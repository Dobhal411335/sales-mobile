import {useEffect} from 'react';
import {usePriceDisplaySync} from '../../hooks/usePriceDisplaySync';

/** Mount once under Sales to drive the serial customer price LED. */
export function PriceDisplayAgent() {
  usePriceDisplaySync(true);

  useEffect(() => {
    // Sync hook owns lifecycle
  }, []);

  return null;
}
