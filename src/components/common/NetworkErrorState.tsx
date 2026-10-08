import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';

interface NetworkErrorStateProps {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  /** Banner layout for top-of-screen errors */
  compact?: boolean;
}

/**
 * Shared offline / API-failure UI with a Try Again action.
 * Retries the caller-provided operation (does not reload the whole app).
 */
export function NetworkErrorState({
  title = 'Unable to load',
  message = 'Check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  compact = false,
}: NetworkErrorStateProps) {
  if (compact) {
    return (
      <View style={styles.banner}>
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerTitle}>{title}</Text>
          {message ? <Text style={styles.bannerMessage}>{message}</Text> : null}
        </View>
        {onRetry ? (
          <Pressable
            style={({pressed}) => [
              styles.bannerButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={retryLabel}>
            <Text style={styles.bannerButtonText}>{retryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Pressable
          style={({pressed}) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}>
          <Text style={styles.buttonText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.error,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 420,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  bannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.error,
  },
  bannerMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bannerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
