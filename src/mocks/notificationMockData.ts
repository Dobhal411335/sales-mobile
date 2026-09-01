import type {Notification} from '../types/notification';
import {categorizeNotificationType} from '../types/notification';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'KOT_CREATED',
    title: 'KOT Created',
    message: 'Kitchen ticket created for Order #0163',
    priority: 'normal',
    category: 'Orders',
    tableSessionId: 'session-0163',
    metadata: {orderNumber: '0163', tableNo: '03'},
    recipientScope: 'RESTAURANT',
    isRead: false,
    createdAt: hoursAgo(5),
  },
  {
    id: 'notif-002',
    type: 'NEW_ORDER',
    title: 'New Order',
    message: 'New order placed for Table 03',
    priority: 'high',
    category: 'Orders',
    tableSessionId: 'session-0163',
    metadata: {orderNumber: '0163', tableNo: '03'},
    recipientScope: 'RESTAURANT',
    isRead: false,
    playSound: true,
    createdAt: hoursAgo(5),
  },
  {
    id: 'notif-003',
    type: 'TABLE_ASSIGNED',
    title: 'Table Assigned',
    message: 'Table 03 assigned to you',
    priority: 'normal',
    category: 'Tables',
    tableId: 'table-03',
    metadata: {tableNo: '03'},
    recipientScope: 'USER',
    recipientId: 'mock-employee',
    isRead: false,
    createdAt: hoursAgo(6),
  },
  {
    id: 'notif-004',
    type: 'PAYMENT_COMPLETED',
    title: 'Payment Completed',
    message: 'Payment received for Order #0158',
    priority: 'high',
    category: 'Payments',
    tableSessionId: 'session-0158',
    metadata: {orderNumber: '0158', tableNo: '07'},
    recipientScope: 'RESTAURANT',
    isRead: false,
    playSound: true,
    createdAt: hoursAgo(2),
  },
  {
    id: 'notif-005',
    type: 'EMPLOYEE_LOGIN',
    title: 'Employee Clocked In',
    message: 'Sarah Miller clocked in',
    priority: 'normal',
    category: 'Employees',
    employeeId: 'emp-sarah',
    metadata: {
      employeeName: 'Sarah Miller',
      employeeRole: 'Server',
      loginTime: hoursAgo(8),
    },
    recipientScope: 'RESTAURANT',
    isRead: true,
    createdAt: hoursAgo(8),
  },
  {
    id: 'notif-006',
    type: 'PRINT_FAILED',
    title: 'Print Failed',
    message: 'KOT print job failed for Order #0155',
    priority: 'high',
    category: 'System',
    printJobId: 'print-0155',
    tableSessionId: 'session-0155',
    metadata: {orderNumber: '0155', tableNo: '12'},
    recipientScope: 'RESTAURANT',
    isRead: true,
    playSound: true,
    createdAt: hoursAgo(1),
  },
  {
    id: 'notif-007',
    type: 'ORDER_CANCELLED',
    title: 'Order Cancelled',
    message: 'Order #0149 was cancelled',
    priority: 'high',
    category: 'Orders',
    tableSessionId: 'session-0149',
    metadata: {orderNumber: '0149', tableNo: '05'},
    recipientScope: 'RESTAURANT',
    isRead: true,
    createdAt: minutesAgo(45),
  },
  {
    id: 'notif-008',
    type: 'SYSTEM_ALERT',
    title: 'System Alert',
    message: 'Printer connection restored',
    priority: 'low',
    category: 'System',
    recipientScope: 'RESTAURANT',
    isRead: true,
    createdAt: minutesAgo(20),
  },
];

let mockStore: Notification[] = MOCK_NOTIFICATIONS.map((n) => ({
  ...n,
  category: n.category ?? categorizeNotificationType(n.type),
}));

export function getMockNotifications(): Notification[] {
  return mockStore.map((n) => ({...n}));
}

export function setMockNotifications(notifications: Notification[]): void {
  mockStore = notifications.map((n) => ({...n}));
}

export function resetMockNotifications(): void {
  mockStore = MOCK_NOTIFICATIONS.map((n) => ({
    ...n,
    category: n.category ?? categorizeNotificationType(n.type),
  }));
}
