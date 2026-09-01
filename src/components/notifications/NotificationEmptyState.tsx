import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {NotificationFilter} from '../../types/notification';

interface NotificationEmptyStateProps {
  filter: NotificationFilter;
  fullScreen?: boolean;
}

function getMessage(filter: NotificationFilter, fullScreen: boolean): string {
  if (fullScreen && filter === 'All') {
    return 'No notifications today.';
  }
  switch (filter) {
    case 'All':
      return 'No notifications yet.';
    case 'Unread':
      return "You're all caught up.";
    case 'Orders':
      return 'No order notifications.';
    case 'Payments':
      return 'No payment notifications.';
    case 'Tables':
      return 'No table notifications.';
    case 'Employees':
      return 'No employee notifications.';
    case 'System':
      return 'No system notifications.';
    default:
      return 'No notifications found.';
  }
}

export function NotificationEmptyState({
  filter,
  fullScreen = false,
}: NotificationEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{getMessage(filter, fullScreen)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
