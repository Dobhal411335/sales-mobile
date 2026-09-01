import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {Notification} from '../../types/notification';
import {
  categoryIcon,
  displayNotificationTime,
  notificationMessageLine,
  notificationMetaLine,
} from '../../utils/notificationDisplay';

interface NotificationCardProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  compact?: boolean;
}

export function NotificationCard({
  notification,
  onPress,
  compact = false,
}: NotificationCardProps) {
  const unread = !notification.isRead;
  const icon = categoryIcon(notification.category);

  return (
    <Pressable
      style={({pressed}) => [
        styles.card,
        unread && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityState={{selected: unread}}
      accessibilityLabel={notification.title}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, unread && styles.titleUnread]}
            numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.time}>
            {displayNotificationTime(notification)}
          </Text>
        </View>

        {!compact && notificationMetaLine(notification) ? (
          <Text style={styles.meta} numberOfLines={1}>
            {notificationMetaLine(notification)}
          </Text>
        ) : null}

        {!compact ? (
          <Text style={styles.message} numberOfLines={2}>
            {notificationMessageLine(notification)}
          </Text>
        ) : (
          <Text style={styles.message} numberOfLines={1}>
            {notificationMetaLine(notification) ||
              notificationMessageLine(notification)}
          </Text>
        )}
      </View>

      {unread ? <View style={styles.unreadDot} accessibilityLabel="Unread" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  cardUnread: {
    backgroundColor: '#FFF7ED',
    borderLeftColor: colors.primary,
  },
  cardPressed: {
    backgroundColor: colors.cream,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  titleUnread: {
    fontWeight: '800',
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  message: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
});
