import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';

interface ActionSheetOption {
  label: string;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  options: ActionSheetOption[];
}

export function ActionSheet({
  visible,
  title,
  onClose,
  options,
}: ActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.title}>{title}</Text>
            {options.map((option) => (
              <Pressable
                key={option.label}
                style={({pressed}) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={option.label}>
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={({pressed}) => [
                styles.cancelButton,
                pressed && styles.optionPressed,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel">
              <Text style={styles.cancelText}>Cancel</Text>
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  option: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
