import React, {useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import {Globe, RefreshCw, ShoppingBag, UserRound} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {OnlineStaffMember} from '../../services/onlineStaffService';
import type {ConnectionStatus, Floor, GridMode} from '../../types/table';
import {UsersIcon} from '../common/Icons';
import {Popover} from '../common/Popover';
import {FloorSelector} from './FloorSelector';

export type FloorOrderShortcut = 'walking' | 'staff' | 'online';

interface FloorAttention {
  walkInUnpaid: number;
  staffUnpaid: number;
  onlineOpen: number;
}

interface FloorHeaderProps {
  floors: Floor[];
  activeFloor?: Floor | null;
  tableCount?: number;
  activeSessionCount?: number;
  activeOrderCount?: number;
  selectedFloorId: string | null;
  gridMode: GridMode;
  onlineStaffCount: number;
  onlineStaff?: OnlineStaffMember[];
  connectionStatus?: ConnectionStatus;
  attention?: FloorAttention;
  refreshing?: boolean;
  onSelectFloor: (floorId: string) => void;
  onToggleGrid: () => void;
  onSelectOrderType: (orderType: FloorOrderShortcut) => void;
  onRefresh?: () => void;
}

const HUB_BUTTONS: {
  id: FloorOrderShortcut;
  label: string;
  Icon: typeof ShoppingBag;
  countKey: keyof FloorAttention;
  border: string;
  background: string;
  text: string;
  badgeBg: string;
}[] = [
  {
    id: 'walking',
    label: 'Walk-in',
    Icon: ShoppingBag,
    countKey: 'walkInUnpaid',
    border: '#FDBA74',
    background: '#FFF7ED',
    text: '#9A3412',
    badgeBg: '#F97316',
  },
  {
    id: 'staff',
    label: 'Staff',
    Icon: UserRound,
    countKey: 'staffUnpaid',
    border: '#A5B4FC',
    background: '#EEF2FF',
    text: '#3730A3',
    badgeBg: '#4F46E5',
  },
  {
    id: 'online',
    label: 'Online',
    Icon: Globe,
    countKey: 'onlineOpen',
    border: '#7DD3FC',
    background: '#F0F9FF',
    text: '#075985',
    badgeBg: '#0284C7',
  },
];

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

function formatBadge(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function FloorHeader({
  floors,
  activeFloor = null,
  tableCount = 0,
  activeSessionCount = 0,
  activeOrderCount = 0,
  selectedFloorId,
  gridMode,
  onlineStaffCount,
  onlineStaff = [],
  connectionStatus = 'disconnected',
  attention = {walkInUnpaid: 0, staffUnpaid: 0, onlineOpen: 0},
  refreshing = false,
  onSelectFloor,
  onToggleGrid,
  onSelectOrderType,
  onRefresh,
}: FloorHeaderProps) {
  const [staffOpen, setStaffOpen] = useState(false);

  const activeFloorName =
    activeFloor?.name ||
    floors.find((f) => f.id === selectedFloorId)?.name ||
    '';

  const subtitle = [
    activeFloorName ? `${activeFloorName} ·` : null,
    `${tableCount} Tables`,
    `• ${activeSessionCount} Active`,
    activeOrderCount > 0 ? `• ${activeOrderCount} with orders` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Floor Operations</Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
          <FloorSelector
          floors={floors}
          selectedFloorId={selectedFloorId}
          onSelectFloor={onSelectFloor}
          compact
        />

        {onRefresh ? (
          <Pressable
            style={({pressed}) => [
              styles.refreshButton,
              pressed && styles.refreshButtonPressed,
              refreshing && styles.refreshButtonDisabled,
            ]}
            onPress={onRefresh}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel="Refresh floor">
            <RefreshCw size={14} color={colors.text} strokeWidth={2.4} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        ) : null}

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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  titleSection: {
    flexShrink: 1,
    minWidth: 160,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  hubGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: colors.surface,
    flexShrink: 1,
  },
  hubButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hubButtonPressed: {
    opacity: 0.88,
  },
  hubButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  hubBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 6,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  refreshButton: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshButtonPressed: {
    backgroundColor: '#F5F5F4',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
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
    fontSize: 10,
    fontWeight: '700',
  },
  connectionDotLive: {
    color: '#059669',
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
    width: 280,
    maxWidth: '90%',
    padding: 14,
  },
  staffTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  staffSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  staffList: {
    maxHeight: 220,
  },
  staffEmpty: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingVertical: 8,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryHover,
  },
  staffInfo: {
    flex: 1,
    minWidth: 0,
  },
  staffName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  staffRole: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
});
