import {useEffect} from 'react';
import {useCustomerDisplaySync} from '../../hooks/useCustomerDisplaySync';

/**
 * Mount once under Sales to drive the customer-facing secondary display.
 */
export function CustomerDisplayAgent() {
  useCustomerDisplaySync(true);

  useEffect(() => {
    // Intentionally empty — sync hook owns lifecycle
  }, []);

  return null;
}
