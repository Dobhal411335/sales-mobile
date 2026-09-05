import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {Notification, NotificationFilter} from '../../types/notification';
import {useNotificationStore} from '../../store/notificationStore';
import {NotificationCard} from './NotificationCard';
import {NotificationEmptyState} from './NotificationEmptyState';
import {NotificationFilterChips} from './NotificationFilterChips';
import {NotificationSoundToggle} from './NotificationSoundToggle';

const PREVIEW_VISIBLE_LIMIT = 10;

interface NotificationPreviewProps {
  onViewAll: () => void;
  onNotificationPress: (notification: Notification) => void;
}

export function NotificationPreview({
  onViewAll,
  onNotificationPress,
}: NotificationPreviewProps) {
  const [previewFilter, setPreviewFilter] = useState<NotificationFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const soundEnabled = useNotificationStore((s) => s.soundEnabled);
  const soundPlaybackAvailable = useNotificationStore(
    (s) => s.soundPlaybackAvailable,
  );
  const markingAllRead = useNotificationStore((s) => s.markingAllRead);
  const loading = useNotificationStore((s) => s.loading);
  const notifications = useNotificationStore((s) => s.notifications);
  const toggleSound = useNotificationStore((s) => s.toggleSound);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notifications
      .filter((n) => {
        const cat = n.category || 'System';
        const matchesTab =
          previewFilter === 'All'
            ? true
            : previewFilter === 'Unread'
              ? !n.isRead
              : cat === previewFilter;

        const matchesSearch =
          !q ||
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q) ||
          String(n.metadata?.orderNumber || '').includes(q);

        return matchesTab && matchesSearch;
      })
      .slice(0, PREVIEW_VISIBLE_LIMIT);
  }, [notifications, previewFilter, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <NotificationSoundToggle
            enabled={soundEnabled}
            playbackAvailable={soundPlaybackAvailable}
            onToggle={() => void toggleSound()}
            compact
          />

          {unreadCount > 0 ? (
            <Pressable
              style={({pressed}) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
                markingAllRead && styles.actionButtonDisabled,
              ]}
              onPress={() => void markAllRead()}
              disabled={markingAllRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all read">
              <Text style={styles.actionButtonText}>
                {markingAllRead ? '...' : '✓ All'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <TextInput
        style={styles.search}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search..."
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Search notifications"
      />

      <NotificationFilterChips
        activeFilter={previewFilter}
        onFilterChange={setPreviewFilter}
      />

      {loading && notifications.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <NotificationEmptyState filter={previewFilter} />
          }
          renderItem={({item}) => (
            <NotificationCard
              notification={item}
              onPress={onNotificationPress}
              compact
            />
          )}
        />
      )}

      <Pressable
        style={({pressed}) => [
          styles.viewAll,
          pressed && styles.viewAllPressed,
        ]}
        onPress={onViewAll}
        accessibilityRole="button"
        accessibilityLabel="View all notifications">
        <Text style={styles.viewAllText}>View All Notifications →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 480,
    maxHeight: 560,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surface,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minHeight: 36,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  actionButtonPressed: {
    backgroundColor: colors.cream,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  search: {
    marginHorizontal: 12,
    marginBottom: 8,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  list: {
    maxHeight: 320,
  },
  loading: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  viewAll: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  viewAllPressed: {
    backgroundColor: colors.cream,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});

