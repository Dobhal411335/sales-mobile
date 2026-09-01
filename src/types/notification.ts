export const NOTIFICATION_TYPES = [
  'NEW_ORDER',
  'ORDER_UPDATED',
  'ORDER_CANCELLED',
  'ORDER_COMPLETED',
  'PAYMENT_COMPLETED',
  'PAYMENT_FAILED',
  'REFUND',
  'KOT_CREATED',
  'KOT_READY',
  'TABLE_ASSIGNED',
  'TABLE_RELEASED',
  'TABLE_TRANSFERRED',
  'TABLE_REASSIGNED',
  'EMPLOYEE_LOGIN',
  'EMPLOYEE_LOGOUT',
  'OVERTIME',
  'PRINT_FAILED',
  'SYSTEM_ALERT',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationCategory =
  | 'Orders'
  | 'Payments'
  | 'Tables'
  | 'Employees'
  | 'System';

export type NotificationFilter =
  | 'All'
  | 'Unread'
  | 'Orders'
  | 'Payments'
  | 'Tables'
  | 'Employees'
  | 'System';

export type NotificationPriority = 'low' | 'normal' | 'high';

export type NotificationRecipientScope = 'RESTAURANT' | 'USER';

export interface NotificationMetadata {
  orderNumber?: string | number;
  tableNo?: string | number;
  employeeName?: string;
  employeeRole?: string;
  sessionId?: string;
  loginTime?: string;
  logoutTime?: string;
  durationLabel?: string;
  actorName?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  _id?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  orderId?: string | null;
  tableId?: string | null;
  tableSessionId?: string | null;
  employeeId?: string | null;
  printJobId?: string | null;
  metadata?: NotificationMetadata;
  recipientScope?: NotificationRecipientScope;
  recipientId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  playSound?: boolean;
}

export interface NotificationsListData {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  unreadCount: number;
  restaurantId?: string;
}

export interface NotificationsListResponse {
  success: boolean;
  data?: NotificationsListData;
  message?: string;
}

export interface UnreadCountResponse {
  success: boolean;
  data?: {unreadCount: number; restaurantId?: string};
  message?: string;
}

export interface MarkReadResponse {
  success: boolean;
  data?: Notification;
  message?: string;
}

export interface MarkAllReadResponse {
  success: boolean;
  data?: {modified: number};
  message?: string;
}

export const NOTIFICATION_FILTERS: NotificationFilter[] = [
  'All',
  'Unread',
  'Orders',
  'Payments',
  'Tables',
  'Employees',
  'System',
];

export function categorizeNotificationType(
  type: NotificationType,
): NotificationCategory {
  if (
    [
      'NEW_ORDER',
      'ORDER_UPDATED',
      'ORDER_CANCELLED',
      'ORDER_COMPLETED',
      'KOT_CREATED',
      'KOT_READY',
    ].includes(type)
  ) {
    return 'Orders';
  }
  if (['PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'REFUND'].includes(type)) {
    return 'Payments';
  }
  if (
    [
      'TABLE_ASSIGNED',
      'TABLE_RELEASED',
      'TABLE_TRANSFERRED',
      'TABLE_REASSIGNED',
    ].includes(type)
  ) {
    return 'Tables';
  }
  if (['EMPLOYEE_LOGIN', 'EMPLOYEE_LOGOUT', 'OVERTIME'].includes(type)) {
    return 'Employees';
  }
  return 'System';
}

export function filterToApiParam(filter: NotificationFilter): string {
  if (filter === 'Unread') {
    return 'UNREAD';
  }
  if (filter === 'All') {
    return 'ALL';
  }
  return filter;
}
