import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {FloorTable, TableSession} from '../../types/table';

interface TableReadonlySheetProps {
  visible: boolean;
  table: FloorTable | null;
  session: TableSession | null;
  showAdminOverride?: boolean;
  onAdminOverride?: () => void;
  onClose: () => void;
}

export function TableReadonlySheet({
  visible,
  table,
  session,
  showAdminOverride = false,
  onAdminOverride,
  onClose,
}: TableReadonlySheetProps) {
  const {width} = useWindowDimensions();
  const dialogWidth = Math.min(width - 48, 400);

  if (!table || !session) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, {width: dialogWidth}]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Table {table.tableNumber}</Text>
            <Pressable
              style={styles.closeIconButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>
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

          {showAdminOverride && onAdminOverride ? (
            <Pressable
              style={({pressed}) => [
                styles.adminButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onAdminOverride}
              accessibilityRole="button"
              accessibilityLabel="Admin override actions">
              <Text style={styles.adminButtonText}>Admin Override Actions</Text>
            </Pressable>
          ) : null}
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
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  closeIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
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
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoRow: {
    marginTop: 12,
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
  buttonPressed: {
    opacity: 0.9,
  },
  adminButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});
