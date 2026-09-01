import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {DayCloseSummary} from '../../../components/day-close/DayCloseSummary';
import {colors} from '../../../constants/colors';

interface DayCloseReadyProps {
  closing: boolean;
  onClosePress: () => void;
  onCancel: () => void;
}

const READY_MESSAGE =
  'All pending orders are settled and all tables are free. You can close the restaurant and log out all employees. Staff can clock back in later from the same registered device.';

export function DayCloseReady({
  closing,
  onClosePress,
  onCancel,
}: DayCloseReadyProps) {
  return (
    <View style={styles.container}>
      <DayCloseSummary message={READY_MESSAGE} />

      <View style={styles.actions}>
        <Pressable
          style={({pressed}) => [
            styles.cancelButton,
            pressed && styles.cancelButtonPressed,
          ]}
          onPress={onCancel}
          disabled={closing}
          accessibilityRole="button"
          accessibilityLabel="Cancel">
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={({pressed}) => [
            styles.closeButton,
            pressed && !closing && styles.closeButtonPressed,
            closing && styles.closeButtonDisabled,
          ]}
          onPress={onClosePress}
          disabled={closing}
          accessibilityRole="button"
          accessibilityLabel="Close Restaurant">
          {closing ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.closeButtonText}>Close Restaurant</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    paddingTop: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  cancelButton: {
    minHeight: 52,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cancelButtonPressed: {
    backgroundColor: colors.cream,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  closeButton: {
    minHeight: 52,
    minWidth: 200,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  closeButtonPressed: {
    opacity: 0.92,
  },
  closeButtonDisabled: {
    opacity: 0.7,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
});
