/**
 * Placeholder order status values.
 * Align with the existing backend/web enums before production use.
 */
export const OrderStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];
