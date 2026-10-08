import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {colors} from '../../constants/colors';

interface PopoverProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Lightweight header menus. Uses Modal without animation so open feels instant
 * on POS tablets (fade caused noticeable delay). Full forms still use TabletModal.
 *
 * Same dismiss pattern as ActionSheet / TabletModal: the backdrop Pressable is
 * flex:1 and only wraps a content-sized child, so taps on empty space close it.
 */
export function Popover({
  visible,
  onClose,
  children,
  align = 'end',
  contentStyle,
}: PopoverProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable
        style={[
          styles.backdrop,
          align === 'start' && styles.alignStart,
          align === 'center' && styles.alignCenter,
          align === 'end' && styles.alignEnd,
        ]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu">
        <Pressable
          style={[styles.content, contentStyle]}
          onPress={(event) => event.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  alignStart: {
    alignItems: 'flex-start',
  },
  alignCenter: {
    alignItems: 'center',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  content: {
    minWidth: 280,
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
});
