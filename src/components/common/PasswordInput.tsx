import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import {colors} from '../../constants/colors';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  isFocused: boolean;
  visible: boolean;
  onToggleVisibility: () => void;
}

export function PasswordInput({
  label,
  isFocused,
  visible,
  onToggleVisibility,
  ...inputProps
}: PasswordInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[styles.inputRow, isFocused && styles.inputFocused]}
        accessibilityLabel={label}>
        <TextInput
          {...inputProps}
          style={styles.input}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="done"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={label}
        />
        <Pressable
          onPress={onToggleVisibility}
          style={styles.toggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
          <Text style={styles.toggleText}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  toggle: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
