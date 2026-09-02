import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {SalesStackParamList} from '../../navigation/types';
import {useNotificationActions} from '../../hooks/useNotificationActions';
import {useNotificationStore} from '../../store/notificationStore';
import {BellIcon} from '../common/Icons';
import {Popover} from '../common/Popover';
import {NotificationPreview} from './NotificationPreview';

export type NotificationNavigator = {
  navigate: (
    screen: keyof SalesStackParamList,
    params?: SalesStackParamList[keyof SalesStackParamList],
  ) => void;
};

interface NotificationBellProps {
  navigation: NotificationNavigator;
}

export function NotificationBell({navigation}: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const refreshPreview = useNotificationStore((s) => s.refreshPreview);
  const initialize = useNotificationStore((s) => s.initialize);
  const initialized = useNotificationStore((s) => s.initialized);

  const {handleNotificationPress} = useNotificationActions(navigation);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  useEffect(() => {
    if (open) {
      void refreshPreview();
    }
  }, [open, refreshPreview]);

  const closePreview = useCallback(() => {
    setOpen(false);
  }, []);

  const onViewAll = useCallback(() => {
    setOpen(false);
    navigation.navigate('Notifications');
  }, [navigation]);

  const onNotificationPress = useCallback(
    (notification: Parameters<typeof handleNotificationPress>[0]) => {
      void handleNotificationPress(notification, {closePreview});
    },
    [handleNotificationPress, closePreview],
  );

  const badgeLabel =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <>
      <Pressable
        style={({pressed}) => [
          styles.iconButton,
          pressed && styles.iconButtonPressed,
        ]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }>
        <BellIcon size={20} color="#D97706" />
        {badgeLabel ? (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
      </Pressable>

      <Popover
        visible={open}
        onClose={closePreview}
        align="end"
        contentStyle={styles.popoverContent}>
        <NotificationPreview
          onViewAll={onViewAll}
          onNotificationPress={onNotificationPress}
        />
      </Popover>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  iconButtonPressed: {
    backgroundColor: colors.cream,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.surface,
  },
  popoverContent: {
    minWidth: 480,
    maxWidth: 520,
    padding: 12,
  },
});
