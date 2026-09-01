import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TABLE_STATUS_STYLES} from '../../constants/tableStatus';
import {colors} from '../../constants/colors';
import type {FloorTable, TableDisplayStatus, TableSession} from '../../types/table';
import {
  getEmployeeFirstName,
  isSessionOwnedByUser,
} from '../../utils/tableStatus';

interface TableCardProps {
  table: FloorTable;
  session: TableSession | null;
  status: TableDisplayStatus;
  currentUserId: string | null;
  selected: boolean;
  onPress: () => void;
}

export function TableCard({
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

  return (
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
      accessibilityLabel={`Table ${table.tableNumber}, ${statusStyle.label}`}
      accessibilityState={{selected}}>
      <Text style={[styles.tableNumber, {color: statusStyle.text}]}>
        TABLE {table.tableNumber}
      </Text>

      <Text style={[styles.status, {color: statusStyle.statusText}]}>
        {statusStyle.label}
      </Text>

      {session ? (
        <View style={styles.sessionMeta}>
          <View style={styles.guestRow}>
            {employeeFirst ? (
              <Text style={[styles.employeeName, {color: statusStyle.text}]}>
                {employeeFirst}
              </Text>
            ) : null}
            <Text style={[styles.guestCount, {color: statusStyle.statusText}]}>
              {session.guestCount}
            </Text>
          </View>
          <Text style={[styles.seats, {color: statusStyle.statusText}]}>
            {table.seats} seats
          </Text>
        </View>
      ) : (
        <Text style={styles.seatsAvailable}>{table.seats} seats</Text>
      )}

      {isOther ? (
        <View style={styles.lockBadge}>
          <Text style={styles.lockText}>🔒</Text>
        </View>
      ) : null}

      {isMine && statusStyle.dot ? (
        <View style={[styles.statusDot, {backgroundColor: statusStyle.dot}]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 96,
    minHeight: 96,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    position: 'relative',
  },
  cardRound: {
    borderRadius: 999,
  },
  cardSelected: {
    borderWidth: 3,
    backgroundColor: colors.cream,
  },
  cardPressed: {
    opacity: 0.92,
  },
  tableNumber: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  status: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sessionMeta: {
    marginTop: 8,
    alignItems: 'center',
    gap: 2,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  employeeName: {
    fontSize: 13,
    fontWeight: '700',
  },
  guestCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  seats: {
    fontSize: 11,
    fontWeight: '600',
  },
  seatsAvailable: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  lockBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    fontSize: 10,
  },
  statusDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.text,
  },
});
