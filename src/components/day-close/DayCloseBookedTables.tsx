import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {DayCloseBookedTable} from '../../types/dayClose';

interface DayCloseBookedTablesProps {
  tables: DayCloseBookedTable[];
  totalCount: number;
  onTablePress?: (table: DayCloseBookedTable) => void;
  onGoToFloor?: () => void;
}

function formatTableMeta(table: DayCloseBookedTable): string {
  const parts: string[] = [];
  if (table.employeeName) {
    parts.push(table.employeeName);
  }
  if (table.guestCount) {
    parts.push(
      `${table.guestCount} guest${table.guestCount === 1 ? '' : 's'}`,
    );
  }
  return parts.join(' · ');
}

export function DayCloseBookedTables({
  tables,
  totalCount,
  onTablePress,
  onGoToFloor,
}: DayCloseBookedTablesProps) {
  const hiddenCount = Math.max(0, totalCount - tables.length);

  return (
    <View style={styles.container}>
      {tables.map((table) => {
        const meta = formatTableMeta(table);
        return (
          <Pressable
            key={table.sessionId}
            style={({pressed}) => [
              styles.row,
              pressed && styles.rowPressed,
            ]}
            onPress={() => onTablePress?.(table)}
            accessibilityRole="button"
            accessibilityLabel={`Table ${table.tableNumber}`}>
            <Text style={styles.tableNumber}>Table {table.tableNumber}</Text>
            {meta ? (
              <Text style={styles.meta} numberOfLines={2}>
                {meta}
              </Text>
            ) : null}
          </Pressable>
        );
      })}

      {hiddenCount > 0 ? (
        <Text style={styles.moreText}>
          +{hiddenCount} more on the Floor screen
        </Text>
      ) : null}

      {onGoToFloor ? (
        <Pressable
          style={({pressed}) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onGoToFloor}
          accessibilityRole="button"
          accessibilityLabel="Go to Floor">
          <Text style={styles.actionButtonText}>Go to Floor</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  rowPressed: {
    backgroundColor: colors.cream,
  },
  tableNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: '#9F1239',
    lineHeight: 18,
  },
  moreText: {
    fontSize: 12,
    color: '#9F1239',
    fontWeight: '600',
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionButtonPressed: {
    backgroundColor: colors.primaryHover,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
});
