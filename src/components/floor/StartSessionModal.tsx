import React, {useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {FloorTable} from '../../types/table';
import {startTableSession} from '../../services/tableService';

interface StartSessionModalProps {
  visible: boolean;
  table: FloorTable | null;
  floorName?: string | null;
  onClose: () => void;
  onSessionStarted: (sessionId: string, tableId: string) => void;
}

export function StartSessionModal({
  visible,
  table,
  floorName,
  onClose,
  onSessionStarted,
}: StartSessionModalProps) {
  const [guestCount, setGuestCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible && table) {
      setGuestCount(table.seats || 2);
      setError(null);
      setLoading(false);
    }
  }, [visible, table]);

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
                <Text style={styles.confirmText}>Start Session</Text>
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
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    minWidth: 48,
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
    backgroundColor: colors.primary,
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
