import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {FloorTable, TableSession} from '../../types/table';
import {startTableSession} from '../../services/tableService';
import {
  buildCombineGroups,
  sumSeatsForTables,
  toggleLinkedTableIds,
} from '../../utils/floorCombineTables';
import {CombineTablePicker} from './CombineTablePicker';

interface StartSessionModalProps {
  visible: boolean;
  table: FloorTable | null;
  floorName?: string | null;
  tables: FloorTable[];
  sessions: TableSession[];
  currentUserId: string | null;
  onClose: () => void;
  onSessionStarted: (sessionId: string, tableId: string) => void;
}

export function StartSessionModal({
  visible,
  table,
  floorName,
  tables,
  sessions,
  currentUserId,
  onClose,
  onSessionStarted,
}: StartSessionModalProps) {
  const [guestCount, setGuestCount] = useState(2);
  const [selectedLinkedTableIds, setSelectedLinkedTableIds] = useState<string[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && table) {
      setGuestCount(table.seats || 2);
      setSelectedLinkedTableIds([]);
      setError(null);
      setLoading(false);
    }
  }, [visible, table]);

  const combineGroups = useMemo(() => {
    if (!table) {
      return {available: [], mine: []};
    }
    return buildCombineGroups(
      tables,
      sessions,
      table.id,
      currentUserId,
      null,
    );
  }, [table, tables, sessions, currentUserId]);

  const combinedSeatTotal = useMemo(() => {
    if (!table) {
      return 0;
    }
    return sumSeatsForTables(tables, [table.id, ...selectedLinkedTableIds]);
  }, [table, tables, selectedLinkedTableIds]);

  const partyLargerThanSeats = guestCount > combinedSeatTotal;

  const handleToggleLinked = (tableId: string, siblingIds: string[]) => {
    if (!table) {
      return;
    }
    setSelectedLinkedTableIds((prev) =>
      toggleLinkedTableIds(prev, tableId, siblingIds, table.id),
    );
  };

  const handleConfirm = async () => {
    if (!table) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await startTableSession({
        tableId: table.id,
        guestCount,
        linkedTableIds: selectedLinkedTableIds,
      });
      onSessionStarted(result.sessionId, table.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to assign table.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!table) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Table {table.tableNumber}</Text>
          <Text style={styles.subtitle}>
            {floorName ? `${floorName} · ` : ''}
            {table.seats}-seat table
          </Text>

          <Text style={styles.label}>Number of Guests</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setGuestCount((c) => Math.max(1, c - 1))}
              disabled={loading || guestCount <= 1}
              accessibilityRole="button"
              accessibilityLabel="Decrease guest count">
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <Text style={styles.guestCount}>{guestCount}</Text>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setGuestCount((c) => c + 1)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Increase guest count">
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Combine tables</Text>
          <Text style={styles.sectionHint}>
            Optional. Select extra empty tables or your booked tables for this one
            party.
          </Text>
          <CombineTablePicker
            groups={combineGroups}
            sessions={sessions}
            primaryTableId={table.id}
            selectedLinkedTableIds={selectedLinkedTableIds}
            onToggle={handleToggleLinked}
          />

          <Text style={styles.summaryText}>
            {guestCount} guest{guestCount === 1 ? '' : 's'} · {combinedSeatTotal}{' '}
            combined seats
            {partyLargerThanSeats ? ' · party is larger than seats' : ''}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={({pressed}) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onClose}
              disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({pressed}) => [
                styles.confirmButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={() => {
                handleConfirm().catch(() => {});
              }}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.confirmText}>Seat Guests</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  label: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  sectionLabel: {
    marginTop: 20,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  sectionHint: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  stepperButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  guestCount: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.text,
    minWidth: 48,
    textAlign: 'center',
  },
  summaryText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
