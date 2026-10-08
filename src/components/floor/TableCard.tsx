import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TABLE_STATUS_STYLES} from '../../constants/tableStatus';
import {colors} from '../../constants/colors';
import type {FloorTable, TableDisplayStatus, TableSession} from '../../types/table';
import {
  formatTableCardLabel,
  getEmployeeFirstName,
  isSessionOwnedByUser,
} from '../../utils/tableStatus';
import {UsersIcon} from '../common/Icons';

interface TableCardProps {
  table: FloorTable;
  session: TableSession | null;
  status: TableDisplayStatus;
  currentUserId: string | null;
  selected: boolean;
  onPress: () => void;
}

function TableCardComponent({
  table,
  session,
  status,
  currentUserId,
  selected,
  onPress,
}: TableCardProps) {
  const statusStyle = TABLE_STATUS_STYLES[status];
  const isMine = isSessionOwnedByUser(session, currentUserId);
  const isOther = Boolean(session) && !isMine;
  const employeeFirst = getEmployeeFirstName(session?.assignedEmployeeName);
  const tableLabel = formatTableCardLabel(table.tableNumber);
  const seatsColor = session ? statusStyle.statusText : colors.textSecondary;

  return (
    <View style={styles.outer}>
      <Pressable
        style={({pressed}) => [
          styles.card,
          table.shape === 'round' && styles.cardRound,
          {
            backgroundColor: statusStyle.background,
            borderColor: selected ? colors.primary : statusStyle.border,
          },
          selected && styles.cardSelected,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Table ${tableLabel}, ${statusStyle.label}`}
        accessibilityState={{selected}}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.tableNumber, {color: statusStyle.text}]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {tableLabel}
          </Text>
          <Text
            style={[styles.status, {color: statusStyle.statusText}]}
            numberOfLines={1}>
            {statusStyle.label}
          </Text>
        </View>

        {session && employeeFirst ? (
          <Text
            style={[styles.employeeName, {color: statusStyle.text}]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {employeeFirst}
          </Text>
        ) : null}

        <View style={styles.seatsRow}>
          <UsersIcon size={12} color={seatsColor} />
          <Text style={[styles.seats, {color: seatsColor}]}>
            {table.seats} seats
          </Text>
        </View>
      </Pressable>

      {isOther ? (
        <View style={styles.lockBadge} pointerEvents="none">
          <Text style={styles.lockText}>🔒</Text>
        </View>
      ) : null}

      {isMine && statusStyle.dot ? (
        <View
          style={[styles.statusDot, {backgroundColor: statusStyle.dot}]}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

export const TableCard = memo(TableCardComponent);

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    // Padding keeps status/lock badges outside the card on Android
    // (where overflow:visible is often ignored).
    paddingTop: 5,
    paddingRight: 5,
  },
  card: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  cardRound: {
    borderRadius: 999,
  },
  cardSelected: {
    borderWidth: 2.5,
    backgroundColor: colors.cream,
  },
  cardPressed: {
    opacity: 0.92,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  tableNumber: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
    minWidth: 0,
  },
  status: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    flexShrink: 0,
  },
  employeeName: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
  },
  seatsRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flexShrink: 0,
  },
  seats: {
    fontSize: 11,
    fontWeight: '600',
  },
  lockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#374151',
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lockText: {
    fontSize: 8,
  },
  statusDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
    elevation: 3,
  },
});
