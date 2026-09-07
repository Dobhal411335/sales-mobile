import type {Notification} from '../types/notification';
import type {NotificationNavigator} from '../components/notifications/NotificationBell';

export type NotificationTarget =
  | {screen: 'CreateOrder'; params: {sessionId: string}}
  | {screen: 'PrintJobs'; params: {jobId: string}}
  | {screen: 'Floor'}
  | null;

export function getNotificationTarget(
  notification: Notification,
): NotificationTarget {
  if (
    notification.type === 'EMPLOYEE_LOGIN' ||
    notification.type === 'EMPLOYEE_LOGOUT'
  ) {
    return null;
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
  navigation.navigate(target.screen, target.params);
}
