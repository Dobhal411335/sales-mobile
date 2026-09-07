import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  Bell,
  FileText,
  Lock,
  LogOut,
  Printer,
  TrendingUp,
} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import {useAuth} from '../../hooks/useAuth';
import type {SalesStackParamList} from '../../navigation/types';
import {Popover} from './Popover';

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  employeeName: string;
  onNavigate: (screen: keyof SalesStackParamList) => void;
}

const MENU_ITEMS: {
  label: string;
  screen: keyof SalesStackParamList;
  Icon: React.ComponentType<{size?: number; color?: string}>;
}[] = [
  {label: 'EOD / Reports', screen: 'Reports', Icon: FileText},
  {label: 'Today Sales', screen: 'TodaySales', Icon: TrendingUp},
  {label: 'Print Jobs', screen: 'PrintJobs', Icon: Printer},
  {label: 'Notifications', screen: 'Notifications', Icon: Bell},
  {label: 'Day Close', screen: 'DayClose', Icon: Lock},
];

export function ProfileMenu({
  visible,
  onClose,
  employeeName,
  onNavigate,
}: ProfileMenuProps) {
  const {logout} = useAuth();

  return (
    <Popover visible={visible} onClose={onClose} align="end" contentStyle={styles.menu}>
      <View style={styles.header}>
        <Text style={styles.name}>{employeeName}</Text>
        <Text style={styles.role}>STAFF</Text>
      </View>

      <View style={styles.actions}>
        {MENU_ITEMS.map((item) => {
          const ItemIcon = item.Icon;
          return (
            <Pressable
              key={item.screen}
              style={({pressed}) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => onNavigate(item.screen)}
              accessibilityRole="button"
              accessibilityLabel={item.label}>
              <View style={styles.actionContent}>
                <ItemIcon size={18} color={colors.textSecondary} />
                <Text style={styles.actionText}>{item.label}</Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          style={({pressed}) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={() => {
            onClose();
            logout();
          }}
          accessibilityRole="button"
          accessibilityLabel="Logout">
          <View style={styles.logoutContent}>
            <LogOut size={18} color={colors.surface} />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </Pressable>
      </View>
    </Popover>
  );
}

const styles = StyleSheet.create({
  menu: {
    minWidth: 300,
    padding: 16,
  },
  header: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  role: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionButtonPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  logoutButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
});
