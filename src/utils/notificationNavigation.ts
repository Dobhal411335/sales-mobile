import type {Notification} from '../types/notification';
import type {NotificationNavigator} from '../components/notifications/NotificationBell';

export type NotificationTarget =
  | {screen: 'CreateOrder'; params: {sessionId: string}}
  | {screen: 'PrintJobs'; params: {jobId: string}}
  | {screen: 'Orders'; params?: {filter?: 'ONLINE' | 'ALL'}}
  | {screen: 'Booking'}
  | {screen: 'Floor'}
  | null;

function isOnlineOrderNotification(notification: Notification): boolean {
  const source = String(notification.metadata?.source || '').toUpperCase();
  return source === 'ONLINE';
}

export function getNotificationTarget(
  notification: Notification,
): NotificationTarget {
  if (
    notification.type === 'EMPLOYEE_LOGIN' ||
    notification.type === 'EMPLOYEE_LOGOUT'
  ) {
    return null;
  }
  if (notification.type === 'NEW_RESERVATION') {
    return {screen: 'Booking'};
  }
  if (notification.tableSessionId) {
    return {
      screen: 'CreateOrder',
      params: {sessionId: notification.tableSessionId},
    };
  }
  if (notification.printJobId) {
    return {
      screen: 'PrintJobs',
      params: {jobId: notification.printJobId},
    };
  }
  if (
    notification.type === 'NEW_ORDER' ||
    notification.type === 'ORDER_UPDATED' ||
    notification.type === 'ORDER_COMPLETED' ||
    notification.type === 'ORDER_CANCELLED' ||
    notification.type === 'KOT_CREATED' ||
    notification.type === 'KOT_READY'
  ) {
    return {
      screen: 'Orders',
      params: isOnlineOrderNotification(notification)
        ? {filter: 'ONLINE'}
        : undefined,
    };
  }
  if (notification.type?.startsWith('TABLE')) {
    return {screen: 'Floor'};
  }
  return null;
}

export function navigateToNotificationTarget(
  navigation: NotificationNavigator,
  target: NotificationTarget,
): void {
  if (!target) {
    return;
  }
  if (target.screen === 'Floor') {
    navigation.navigate('Floor');
    return;
  }
  if (target.screen === 'Booking') {
    navigation.navigate('Booking');
    return;
  }
  if (target.screen === 'Orders') {
    navigation.navigate('Orders', target.params);
    return;
  }
  navigation.navigate(target.screen, target.params);
}
