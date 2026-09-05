import React, {useEffect, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackHeaderProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  NotificationBell,
  type NotificationNavigator,
} from '../notifications/NotificationBell';
import {colors} from '../../constants/colors';
import {config} from '../../constants/config';
import {useAuth} from '../../hooks/useAuth';
import type {SalesStackParamList} from '../../navigation/types';
import {formatHeaderDateTime} from '../../utils/date';
import {ChevronDown, Grid2X2, ShoppingBag} from 'lucide-react-native';
import {ProfileMenu} from './ProfileMenu';

type SalesRouteName = keyof SalesStackParamList;

const PRIMARY_TABS: {
  label: string;
  route: SalesRouteName;
  Icon: typeof Grid2X2;
}[] = [
  {label: 'Floor', route: 'Floor', Icon: Grid2X2},
  {label: 'Orders', route: 'Orders', Icon: ShoppingBag},
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
              const iconColor = active ? colors.surface : colors.textSecondary;
              const TabIcon = tab.Icon;
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
                  <TabIcon size={14} color={iconColor} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.right}>
            <Text style={styles.dateTime}>{formatHeaderDateTime(now)}</Text>

            <NotificationBell
              navigation={navigation as NotificationNavigator}
            />

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
              <ChevronDown size={14} color={colors.textSecondary} />
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
    minWidth: 96,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
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
});
