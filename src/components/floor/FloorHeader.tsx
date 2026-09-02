import React, {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {OrderType} from '../../navigation/types';
import type {OnlineStaffMember} from '../../services/onlineStaffService';
import type {ConnectionStatus, Floor, GridMode} from '../../types/table';
import {UsersIcon} from '../common/Icons';
import {Popover} from '../common/Popover';
import {FloorSelector} from './FloorSelector';
import {NewOrderMenu} from './NewOrderMenu';

interface FloorHeaderProps {
  floors: Floor[];
  selectedFloorId: string | null;
  gridMode: GridMode;
  onlineStaffCount: number;
  onlineStaff?: OnlineStaffMember[];
  connectionStatus?: ConnectionStatus;
  onSelectFloor: (floorId: string) => void;
  onToggleGrid: () => void;
  onSelectOrderType: (orderType: OrderType) => void;
}

function getGridLabel(gridMode: GridMode): string {
  if (gridMode === 'lines') {
    return 'Lines';
  }
  if (gridMode === 'dots') {
    return 'Dots';
  }
  return 'Off';
}

function getConnectionLabel(status: ConnectionStatus): string {
  if (status === 'connected') {
    return 'Live';
  }
  if (status === 'connecting' || status === 'reconnecting') {
    return '…';
  }
  return 'Offline';
}

export function FloorHeader({
  floors,
  selectedFloorId,
  gridMode,
  onlineStaffCount,
  onlineStaff = [],
  connectionStatus = 'disconnected',
  onSelectFloor,
  onToggleGrid,
  onSelectOrderType,
}: FloorHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);

  return (
    <View style={styles.header}>
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

      <View style={styles.controls}>
        <FloorSelector
          floors={floors}
          selectedFloorId={selectedFloorId}
          onSelectFloor={onSelectFloor}
          compact
        />

        <Pressable
          style={({pressed}) => [
            styles.gridButton,
            gridMode !== 'none' && styles.gridButtonActive,
            pressed && styles.gridButtonPressed,
          ]}
          onPress={onToggleGrid}
          accessibilityRole="button"
          accessibilityLabel={`Grid mode ${getGridLabel(gridMode)}`}>
          <Text
            style={[
              styles.gridButtonText,
              gridMode !== 'none' && styles.gridButtonTextActive,
            ]}>
            {getGridLabel(gridMode)}
          </Text>
        </Pressable>

        <Pressable
          style={({pressed}) => [
            styles.statusChip,
            pressed && styles.statusChipPressed,
          ]}
          onPress={() => setStaffOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${onlineStaffCount} staff online`}>
          <UsersIcon size={14} color="#065F46" />
          <Text style={styles.onlineText}>{onlineStaffCount} Online</Text>
        </Pressable>

        {connectionStatus !== 'disconnected' ? (
          <View
            style={[
              styles.statusChip,
              connectionStatus === 'connected'
                ? styles.statusChipLive
                : styles.statusChipPending,
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
      </View>

      <NewOrderMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(orderType) => {
          setMenuOpen(false);
          onSelectOrderType(orderType);
        }}
      />

      <Popover
        visible={staffOpen}
        onClose={() => setStaffOpen(false)}
        align="end"
        contentStyle={styles.staffPopover}>
        <Text style={styles.staffTitle}>Currently logged in</Text>
        <Text style={styles.staffSubtitle}>
          {onlineStaffCount} staff with an active session
        </Text>
        <ScrollView style={styles.staffList} nestedScrollEnabled>
          {onlineStaff.length === 0 ? (
            <Text style={styles.staffEmpty}>No one online right now.</Text>
          ) : (
            onlineStaff.map((emp, idx) => (
              <View key={emp.id || `${emp.name}-${idx}`} style={styles.staffRow}>
                <View style={styles.staffAvatar}>
                  <Text style={styles.staffAvatarText}>
                    {(emp.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName} numberOfLines={1}>
                    {idx + 1}. {emp.name || 'Staff'}
                  </Text>
                  <Text style={styles.staffRole} numberOfLines={1}>
                    {emp.role || 'Staff'}
                    {emp.employeeId ? ` · ${emp.employeeId}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </Popover>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  newOrderButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 6,
    flexShrink: 0,
  },
  newOrderButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  newOrderIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
    lineHeight: 20,
  },
  newOrderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    minWidth: 0,
  },
  gridButton: {
    minHeight: 40,
    minWidth: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  gridButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gridButtonPressed: {
    opacity: 0.9,
  },
  gridButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  gridButtonTextActive: {
    color: colors.surface,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusChipLive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusChipPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusChipPressed: {
    opacity: 0.85,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  connectionDot: {
    fontSize: 9,
  },
  connectionDotLive: {
    color: colors.payment,
  },
  connectionDotPending: {
    color: '#D97706',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  connectionTextLive: {
    color: '#065F46',
  },
  staffPopover: {
    minWidth: 300,
    maxWidth: 340,
    padding: 0,
    overflow: 'hidden',
  },
  staffTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  staffSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  staffList: {
    maxHeight: 280,
  },
  staffEmpty: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 14,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  staffInfo: {
    flex: 1,
    minWidth: 0,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  staffRole: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
