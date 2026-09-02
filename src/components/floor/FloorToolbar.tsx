import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {OrderType} from '../../navigation/types';
import type {ConnectionStatus} from '../../types/table';
import {NewOrderMenu} from './NewOrderMenu';

interface FloorToolbarProps {
  onlineStaffCount: number;
  connectionStatus?: ConnectionStatus;
  onSelectOrderType: (orderType: OrderType) => void;
}

function getConnectionLabel(status: ConnectionStatus): string {
  if (status === 'connected') {
    return 'Live';
  }
  if (status === 'connecting' || status === 'reconnecting') {
    return 'Reconnecting...';
  }
  return 'Offline';
}

export function FloorToolbar({
  onlineStaffCount,
  connectionStatus = 'disconnected',
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

      {connectionStatus !== 'disconnected' ? (
        <View
          style={[
            styles.connectionIndicator,
            connectionStatus === 'connected' && styles.connectionLive,
          ]}>
          <Text
            style={[
              styles.connectionDot,
              connectionStatus === 'connected'
                ? styles.connectionDotLive
                : styles.connectionDotPending,
            ]}>
            {connectionStatus === 'connected' ? '●' : '○'}
          </Text>
          <Text
            style={[
              styles.connectionText,
              connectionStatus === 'connected' && styles.connectionTextLive,
            ]}>
            {getConnectionLabel(connectionStatus)}
          </Text>
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
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  connectionLive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  connectionDot: {
    fontSize: 10,
  },
  connectionDotLive: {
    color: colors.payment,
  },
  connectionDotPending: {
    color: '#D97706',
  },
  connectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  connectionTextLive: {
    color: '#065F46',
  },
});
