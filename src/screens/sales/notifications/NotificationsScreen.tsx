import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  FlatList,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {NotificationNavigator} from '../../../components/notifications/NotificationBell';
import {NotificationCard} from '../../../components/notifications/NotificationCard';
import {NotificationEmptyState} from '../../../components/notifications/NotificationEmptyState';
import {NotificationFilterChips} from '../../../components/notifications/NotificationFilterChips';
import {NotificationSoundToggle} from '../../../components/notifications/NotificationSoundToggle';
import {colors} from '../../../constants/colors';
import {useNotificationActions} from '../../../hooks/useNotificationActions';
import type {SalesStackParamList} from '../../../navigation/types';
import {useNotificationStore} from '../../../store/notificationStore';
import type {Notification, NotificationFilter} from '../../../types/notification';

type Props = NativeStackScreenProps<SalesStackParamList, 'Notifications'>;

function ListSeparator() {
  return <View style={styles.separator} />;
}

export function NotificationsScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  const contentWidth = Math.min(width * 0.85, 800);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const filter = useNotificationStore((s) => s.filter);
  const soundEnabled = useNotificationStore((s) => s.soundEnabled);
  const soundPlaybackAvailable = useNotificationStore(
    (s) => s.soundPlaybackAvailable,
  );
  const loading = useNotificationStore((s) => s.loading);
  const refreshing = useNotificationStore((s) => s.refreshing);
  const loadingMore = useNotificationStore((s) => s.loadingMore);
  const markingAllRead = useNotificationStore((s) => s.markingAllRead);
  const hasMore = useNotificationStore((s) => s.hasMore);
  const error = useNotificationStore((s) => s.error);
  const fetchList = useNotificationStore((s) => s.fetchList);
  const setFilter = useNotificationStore((s) => s.setFilter);
  const toggleSound = useNotificationStore((s) => s.toggleSound);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const {handleNotificationPress} = useNotificationActions(
    navigation as NotificationNavigator,
  );

  useFocusEffect(
    useCallback(() => {
      void fetchList({silent: true});
    }, [fetchList]),
  );

  const onFilterChange = useCallback(
    (next: NotificationFilter) => {
      void setFilter(next);
    },
    [setFilter],
  );

  const onRefresh = useCallback(() => {
    void fetchList({silent: true});
  }, [fetchList]);

  const onLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      void fetchList({append: true, silent: true});
    }
  }, [fetchList, hasMore, loadingMore]);

  const renderItem = useCallback(
    ({item}: {item: Notification}) => (
      <NotificationCard
        notification={item}
        onPress={(n) => void handleNotificationPress(n)}
      />
    ),
    [handleNotificationPress],
  );

  const badgeLabel =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <View style={styles.screen}>
      <View style={[styles.content, {width: contentWidth}]}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Pressable
              style={({pressed}) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>

            <View>
              <View style={styles.titleRow}>
                <Text style={styles.pageTitle}>Notifications</Text>
                {badgeLabel ? (
                  <View style={styles.titleBadge}>
                    <Text style={styles.titleBadgeText}>{badgeLabel}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.subtitle}>
                Today only · resets at midnight
              </Text>
            </View>
          </View>

          <View style={styles.pageHeaderActions}>
            <NotificationSoundToggle
              enabled={soundEnabled}
              playbackAvailable={soundPlaybackAvailable}
              onToggle={() => void toggleSound()}
            />

            {unreadCount > 0 ? (
              <Pressable
                style={({pressed}) => [
                  styles.controlButton,
                  pressed && styles.controlButtonPressed,
                  markingAllRead && styles.controlButtonDisabled,
                ]}
                onPress={() => void markAllRead()}
                disabled={markingAllRead}
                accessibilityRole="button"
                accessibilityLabel="Mark all read">
                <Text style={styles.controlButtonText}>
                  {markingAllRead ? 'Marking...' : 'Mark all read'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <NotificationFilterChips
          activeFilter={filter}
          onFilterChange={onFilterChange}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Unable to load notifications.</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => void fetchList({silent: false})}
              accessibilityRole="button"
              accessibilityLabel="Retry">
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && notifications.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.listCard}>
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={ListSeparator}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
              onEndReached={onLoadMore}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={
                !loading ? (
                  <NotificationEmptyState filter={filter} fullScreen />
                ) : undefined
              }
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : hasMore && notifications.length > 0 ? (
                  <Pressable
                    style={styles.loadMore}
                    onPress={onLoadMore}
                    accessibilityRole="button"
                    accessibilityLabel="Load more notifications">
                    <Text style={styles.loadMoreText}>Load more</Text>
                  </Pressable>
                ) : undefined
              }
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingVertical: 16,
  },
  content: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  backButtonPressed: {
    backgroundColor: colors.cream,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  titleBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  titleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surface,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  pageHeaderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    maxWidth: '50%',
  },
  controlButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  controlButtonPressed: {
    backgroundColor: colors.cream,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  listCard: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  separator: {
    height: 0,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMore: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
