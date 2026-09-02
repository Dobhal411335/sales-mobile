import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {TABLE_STATUS_STYLES} from '../../constants/tableStatus';
import {colors} from '../../constants/colors';
import type {FloorTable, TableDisplayStatus, TableSession} from '../../types/table';
import {
  formatTableCardLabel,
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
  const tableLabel = formatTableCardLabel(table.tableNumber);

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
      accessibilityLabel={`Table ${tableLabel}, ${statusStyle.label}`}
      accessibilityState={{selected}}>
      <Text
        style={[styles.tableNumber, {color: statusStyle.text}]}
        numberOfLines={1}>
        {tableLabel}
      </Text>

      <Text style={[styles.status, {color: statusStyle.statusText}]}>
        {statusStyle.label}
      </Text>

      {session ? (
        <View style={styles.sessionMeta}>
          <View style={styles.guestRow}>
            {employeeFirst ? (
              <Text
                style={[styles.employeeName, {color: statusStyle.text}]}
                numberOfLines={1}>
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
    flex: 1,
    width: '100%',
    height: '100%',
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    position: 'relative',
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
  tableNumber: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    maxWidth: '100%',
  },
  status: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sessionMeta: {
    marginTop: 4,
    alignItems: 'center',
    gap: 1,
    maxWidth: '100%',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  employeeName: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  guestCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  seats: {
    fontSize: 11,
    fontWeight: '600',
  },
  seatsAvailable: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  lockBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#374151',
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    fontSize: 8,
  },
  statusDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.text,
  },
});
