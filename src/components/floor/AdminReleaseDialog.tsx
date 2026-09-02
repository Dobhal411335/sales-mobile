import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';

interface AdminReleaseDialogProps {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function AdminReleaseDialog({
  visible,
  loading = false,
  onCancel,
  onConfirm,
}: AdminReleaseDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Admin Override Release</Text>
          <Text style={styles.description}>
            This table has unpaid orders. Enter a reason to force release.
          </Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Release reason"
            multiline
            editable={!loading}
          />
          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.confirmButton,
                (!reason.trim() || loading) && styles.confirmDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!reason.trim() || loading}>
              <Text style={styles.confirmText}>
                {loading ? 'Releasing...' : 'Force Release'}
              </Text>
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
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.error,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    marginTop: 16,
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 16,
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
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
});
