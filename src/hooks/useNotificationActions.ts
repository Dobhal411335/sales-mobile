import {useCallback} from 'react';
import type {NotificationNavigator} from '../components/notifications/NotificationBell';
import type {Notification} from '../types/notification';
import {
  getNotificationTarget,
  navigateToNotificationTarget,
} from '../utils/notificationNavigation';
import {useNotificationStore} from '../store/notificationStore';

export function useNotificationActions(navigation: NotificationNavigator) {
  const markRead = useNotificationStore((s) => s.markRead);

  const handleNotificationPress = useCallback(
    async (notification: Notification, options?: {closePreview?: () => void}) => {
      const target = getNotificationTarget(notification);

      if (!notification.isRead) {
        await markRead(notification.id);
      }

      if (target) {
        options?.closePreview?.();
        navigateToNotificationTarget(navigation, target);
      }
    },
    [markRead, navigation],
  );

  return {handleNotificationPress};
}
