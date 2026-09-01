import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';

interface NotificationSoundToggleProps {
  enabled: boolean;
  playbackAvailable: boolean;
  onToggle: () => void;
  compact?: boolean;
  disabled?: boolean;
}

export function NotificationSoundToggle({
  enabled,
  playbackAvailable,
  onToggle,
  compact = false,
  disabled = false,
}: NotificationSoundToggleProps) {
  const label = enabled ? 'Sound ON' : 'Sound OFF';
  const hint =
    enabled && !playbackAvailable ? ' · rebuild app for audio' : '';

  return (
    <Pressable
      style={({pressed}) => [
        styles.button,
        compact && styles.buttonCompact,
        enabled && styles.buttonOn,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{selected: enabled}}
      accessibilityLabel={`${label}${hint}`}>
      <View style={[styles.indicator, enabled && styles.indicatorOn]} />
      <Text style={[styles.label, compact && styles.labelCompact]}>
        {compact ? (enabled ? 'ON' : 'OFF') : label}
        {!compact && hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonCompact: {
    minHeight: 36,
    paddingHorizontal: 10,
    gap: 6,
  },
  buttonOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  buttonPressed: {
    backgroundColor: colors.cream,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  indicatorOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  labelCompact: {
    fontSize: 12,
  },
  hint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
