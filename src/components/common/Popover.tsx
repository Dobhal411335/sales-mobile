import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
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
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[
            styles.container,
            align === 'start' && styles.alignStart,
            align === 'center' && styles.alignCenter,
            align === 'end' && styles.alignEnd,
          ]}>
          <Pressable
            style={[styles.content, contentStyle]}
            onPress={(event) => event.stopPropagation()}>
            {children}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  container: {
    flex: 1,
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
