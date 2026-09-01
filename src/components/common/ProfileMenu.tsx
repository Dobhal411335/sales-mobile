import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
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

const MENU_ITEMS: {label: string; screen: keyof SalesStackParamList}[] = [
  {label: 'EOD / Reports', screen: 'Reports'},
  {label: 'Print Jobs', screen: 'PrintJobs'},
  {label: 'Notifications', screen: 'Notifications'},
  {label: 'Day Close', screen: 'DayClose'},
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
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.screen}
            style={({pressed}) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => onNavigate(item.screen)}
            accessibilityRole="button"
            accessibilityLabel={item.label}>
            <Text style={styles.actionText}>{item.label}</Text>
          </Pressable>
        ))}

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
          <Text style={styles.logoutText}>Logout</Text>
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
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
});
