import React, {useEffect, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackHeaderProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../constants/colors';
import {config} from '../../constants/config';
import {useAuth} from '../../hooks/useAuth';
import type {SalesStackParamList} from '../../navigation/types';
import {formatHeaderDateTime} from '../../utils/date';
import {ProfileMenu} from './ProfileMenu';

type SalesRouteName = keyof SalesStackParamList;

const PRIMARY_TABS: {label: string; route: SalesRouteName}[] = [
  {label: 'Floor', route: 'Floor'},
  {label: 'Orders', route: 'Orders'},
];

export function SalesHeader({navigation, route}: NativeStackHeaderProps) {
  const {user} = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeRoute = route.name as SalesRouteName;
  const notificationCount = activeRoute === 'Floor' ? 3 : 0;

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.left}>
            <Text style={styles.brandName}>{config.APP_NAME}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{config.APP_SUBTITLE}</Text>
            </View>
          </View>

          <View style={styles.center}>
            {PRIMARY_TABS.map((tab) => {
              const active = activeRoute === tab.route;
              return (
                <Pressable
                  key={tab.route}
                  style={({pressed}) => [
                    styles.tab,
                    active && styles.tabActive,
                    pressed && !active && styles.tabPressed,
                  ]}
                  onPress={() => {
                    if (!active) {
                      navigation.navigate(tab.route);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityState={{selected: active}}
                  accessibilityLabel={tab.label}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.right}>
            <Text style={styles.dateTime}>{formatHeaderDateTime(now)}</Text>

            <Pressable
              style={({pressed}) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel="Notifications">
              <Text style={styles.iconGlyph}>🔔</Text>
              {notificationCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              style={({pressed}) => [
                styles.profileButton,
                pressed && styles.profileButtonPressed,
              ]}
              onPress={() => setProfileOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Employee profile menu">
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'E'}
                </Text>
              </View>
              <View style={styles.profileMeta}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {user?.name ?? 'Employee'}
                </Text>
                <Text style={styles.profileRole}>STAFF</Text>
              </View>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ProfileMenu
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        employeeName={user?.name ?? 'Employee'}
        onNavigate={(screen) => {
          setProfileOpen(false);
          navigation.navigate(screen);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryHover,
    letterSpacing: 0.8,
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tab: {
    minHeight: 40,
    minWidth: 88,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabPressed: {
    backgroundColor: colors.cream,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.surface,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  dateTime: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
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
  iconGlyph: {
    fontSize: 18,
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
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 180,
  },
  profileButtonPressed: {
    backgroundColor: colors.cream,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  profileMeta: {
    flexShrink: 1,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  profileRole: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  chevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
