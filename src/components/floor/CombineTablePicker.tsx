import React from 'react';
import {Pressable, StyleSheet, Text, View, ScrollView} from 'react-native';
import {colors} from '../../constants/colors';
import type {FloorTable, TableSession} from '../../types/table';
import type {CombineTableGroups} from '../../utils/floorCombineTables';
import {findSessionForTable} from '../../utils/tableStatus';

interface CombineTablePickerProps {
  groups: CombineTableGroups;
  sessions: TableSession[];
  primaryTableId: string;
  selectedLinkedTableIds: string[];
  onToggle: (tableId: string, siblingIds: string[]) => void;
}

function CombineTableRow({
  table,
  sessions,
  primaryTableId,
  activeSession,
  checked,
  onToggle,
}: {
  table: FloorTable;
  sessions: TableSession[];
  primaryTableId: string;
  activeSession?: TableSession | null;
  checked: boolean;
  onToggle: (tableId: string, siblingIds: string[]) => void;
}) {
  const tableId = String(table.id);
  const session = findSessionForTable(sessions, tableId);
  const isThisSession =
    activeSession != null &&
    session != null &&
    String(session.id) === String(activeSession.id);
  const siblingIds = isThisSession
    ? []
    : session
      ? [session.tableId, ...(session.linkedTableIds || [])]
          .map((id) => String(id))
          .filter((id) => id && id !== String(primaryTableId))
      : [];

  return (
    <Pressable
      style={({pressed}) => [
        styles.row,
        checked && styles.rowSelected,
        pressed && styles.rowPressed,
      ]}
      onPress={() => onToggle(tableId, siblingIds)}
      accessibilityRole="checkbox"
      accessibilityState={{checked}}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={styles.rowTitle}>Table {table.tableNumber}</Text>
      <Text style={styles.rowMeta}>
        {table.seats} seats{session?.hasActiveOrder ? ' · order' : ''}
      </Text>
    </Pressable>
  );
}

export function CombineTablePicker({
  groups,
  sessions,
  primaryTableId,
  selectedLinkedTableIds,
  onToggle,
  activeSession,
}: CombineTablePickerProps & {activeSession?: TableSession | null}) {
  if (!groups.available.length && !groups.mine.length) {
    return (
      <Text style={styles.emptyText}>
        No other tables on this floor can be combined right now.
      </Text>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      nestedScrollEnabled
      showsVerticalScrollIndicator>
      {groups.available.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>AVAILABLE</Text>
          {groups.available.map((table) => (
            <CombineTableRow
              key={table.id}
              table={table}
              sessions={sessions}
              primaryTableId={primaryTableId}
              activeSession={activeSession}
              checked={selectedLinkedTableIds.includes(String(table.id))}
              onToggle={onToggle}
            />
          ))}
        </View>
      ) : null}
      {groups.mine.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>YOUR TABLES</Text>
          {groups.mine.map((table) => (
            <CombineTableRow
              key={table.id}
              table={table}
              sessions={sessions}
              primaryTableId={primaryTableId}
              activeSession={activeSession}
              checked={selectedLinkedTableIds.includes(String(table.id))}
              onToggle={onToggle}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 192,
  },
  listContent: {
    gap: 12,
    paddingRight: 4,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
  },
  rowPressed: {
    opacity: 0.9,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.surface,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
