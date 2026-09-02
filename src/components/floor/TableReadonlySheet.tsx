import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {FloorTable, TableSession} from '../../types/table';

interface TableReadonlySheetProps {
  visible: boolean;
  table: FloorTable | null;
  session: TableSession | null;
  onClose: () => void;
}

export function TableReadonlySheet({
  visible,
  table,
  session,
  onClose,
}: TableReadonlySheetProps) {
  if (!table || !session) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Table {table.tableNumber}</Text>
            <Text style={styles.badge}>BOOKED</Text>
            <Text style={styles.description}>
              This table is assigned to another employee.
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Server</Text>
              <Text style={styles.infoValue}>
                {session.assignedEmployeeName || 'Unknown'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Guests</Text>
              <Text style={styles.infoValue}>{session.guestCount}</Text>
            </View>
            {session.tableNumbers ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tables</Text>
                <Text style={styles.infoValue}>{session.tableNumbers}</Text>
              </View>
            ) : null}

            <Pressable
              style={({pressed}) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    padding: 16,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  badge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
    backgroundColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    marginTop: 24,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.9,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
