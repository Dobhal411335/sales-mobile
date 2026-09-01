import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';

interface TabletModalFooterAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
}

interface TabletModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  footerActions?: TabletModalFooterAction[];
  splitContent?: {
    left: React.ReactNode;
    right: React.ReactNode;
  };
  maxWidth?: number;
}

export function TabletModal({
  visible,
  title,
  onClose,
  children,
  footerActions,
  splitContent,
  maxWidth = 880,
}: TabletModalProps) {
  const {width, height} = useWindowDimensions();
  const isLandscapeSplit = splitContent && width >= 720;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[styles.modal, {maxWidth, maxHeight: height * 0.92}]}
            onPress={(event) => event.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            {isLandscapeSplit ? (
              <View style={styles.splitBody}>
                <ScrollView
                  style={styles.splitLeft}
                  contentContainerStyle={styles.splitLeftContent}
                  keyboardShouldPersistTaps="handled">
                  {splitContent.left}
                </ScrollView>
                <View style={styles.splitRight}>{splitContent.right}</View>
              </View>
            ) : (
              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                keyboardShouldPersistTaps="handled">
                {splitContent ? (
                  <>
                    {splitContent.left}
                    <View style={styles.portraitRight}>{splitContent.right}</View>
                  </>
                ) : (
                  children ?? null
                )}
              </ScrollView>
            )}

            {footerActions && footerActions.length > 0 ? (
              <View style={styles.footer}>
                {footerActions.map((action) => (
                  <Pressable
                    key={action.label}
                    style={({pressed}) => [
                      styles.footerButton,
                      action.variant === 'primary' && styles.footerPrimary,
                      action.variant === 'destructive' && styles.footerDestructive,
                      action.variant === 'secondary' && styles.footerSecondary,
                      action.disabled && styles.footerDisabled,
                      pressed && !action.disabled && styles.buttonPressed,
                    ]}
                    onPress={action.onPress}
                    disabled={action.disabled || action.loading}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}>
                    <Text
                      style={[
                        styles.footerButtonText,
                        action.variant === 'primary' && styles.footerPrimaryText,
                        action.variant === 'destructive' &&
                          styles.footerDestructiveText,
                        action.variant === 'secondary' &&
                          styles.footerSecondaryText,
                      ]}>
                      {action.loading ? '...' : action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    padding: 20,
  },
  splitBody: {
    flexDirection: 'row',
    flexShrink: 1,
    minHeight: 280,
  },
  splitLeft: {
    flex: 1.2,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.cream,
  },
  splitLeftContent: {
    padding: 20,
    alignItems: 'center',
  },
  splitRight: {
    flex: 0.8,
    padding: 20,
    backgroundColor: colors.surface,
  },
  portraitRight: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  footerPrimary: {
    backgroundColor: colors.primary,
  },
  footerSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerDestructive: {
    backgroundColor: colors.error,
  },
  footerDisabled: {
    opacity: 0.5,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  footerPrimaryText: {
    color: colors.surface,
  },
  footerSecondaryText: {
    color: colors.textSecondary,
  },
  footerDestructiveText: {
    color: colors.surface,
  },
  buttonPressed: {
    opacity: 0.9,
  },
});
