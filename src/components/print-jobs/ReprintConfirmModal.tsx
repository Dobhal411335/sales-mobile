import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Printer} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {PrintJob} from '../../types/printJob';
import {
  orderLabel,
  printTypeLabel,
  printerTargetLabel,
} from '../../utils/printJobDisplay';

interface ReprintConfirmModalProps {
  visible: boolean;
  job: PrintJob | null;
  reprinting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ReprintConfirmModal({
  visible,
  job,
  reprinting,
  onConfirm,
  onCancel,
}: ReprintConfirmModalProps) {
  if (!job) {
    return null;
  }

  const orderNum = orderLabel(job);
  const typeText = printTypeLabel(job.printType);
  const targetText = printerTargetLabel(job.printerTarget);
  const jobIdSlice = String(job._id);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={reprinting ? undefined : onCancel}>
      <Pressable
        style={styles.backdrop}
        onPress={reprinting ? undefined : onCancel}>
        <Pressable
          style={styles.dialog}
          onPress={(event) => event.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Printer size={20} color={colors.primary} strokeWidth={2.4} />
            </View>
            <Text style={styles.title}>Print this ticket again?</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            A new print job will be queued for this order. The original print
            job record will remain unchanged for audit and history.
          </Text>

          {/* Ticket Information Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order:</Text>
              <Text style={styles.infoValue}>#{orderNum}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{typeText}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Target Station:</Text>
              <Text style={styles.infoValue}>{targetText}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Original Job ID:</Text>
              <Text style={[styles.infoValue, styles.monoText]}>
                #{jobIdSlice.slice(-8)}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={({pressed}) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onCancel}
              disabled={reprinting}
              accessibilityRole="button"
              accessibilityLabel="Cancel reprint">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({pressed}) => [
                styles.confirmButton,
                pressed && !reprinting && styles.buttonPressed,
                reprinting && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
              disabled={reprinting}
              accessibilityRole="button"
              accessibilityLabel="Confirm and print again">
              {reprinting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color={colors.surface} />
                  <Text style={styles.confirmText}>Queueing...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Printer size={16} color={colors.surface} strokeWidth={2.4} />
                  <Text style={styles.confirmText}>Confirm & Print Again</Text>
                </View>
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
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  monoText: {
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface,
  },
});
