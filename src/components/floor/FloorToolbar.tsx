import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {OrderType} from '../../navigation/types';
import {NewOrderMenu} from './NewOrderMenu';

interface FloorToolbarProps {
  onlineStaffCount: number;
  onSelectOrderType: (orderType: OrderType) => void;
}

export function FloorToolbar({
  onlineStaffCount,
  onSelectOrderType,
}: FloorToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.toolbar}>
      <Pressable
        style={({pressed}) => [
          styles.newOrderButton,
          pressed && styles.newOrderButtonPressed,
        ]}
        onPress={() => setMenuOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Create new order">
        <Text style={styles.newOrderIcon}>+</Text>
        <Text style={styles.newOrderText}>New Order</Text>
      </Pressable>

      {onlineStaffCount > 0 ? (
        <View style={styles.onlineIndicator}>
          <Text style={styles.onlineDot}>●</Text>
          <Text style={styles.onlineText}>{onlineStaffCount} Online</Text>
        </View>
      ) : null}

      <NewOrderMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(orderType) => {
          setMenuOpen(false);
          onSelectOrderType(orderType);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  newOrderButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  newOrderButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  newOrderIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.surface,
    lineHeight: 24,
  },
  newOrderText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  onlineDot: {
    fontSize: 10,
    color: colors.payment,
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
});
