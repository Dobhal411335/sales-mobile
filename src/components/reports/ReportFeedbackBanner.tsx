import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {EodActionFeedback} from '../../types/eod';

interface ReportFeedbackBannerProps {
  feedback: EodActionFeedback;
  onDismiss?: () => void;
}

export function ReportFeedbackBanner({
  feedback,
  onDismiss,
}: ReportFeedbackBannerProps) {
  if (!feedback) {
    return null;
  }

  const palette = {
    success: {bg: '#DCFCE7', border: '#BBF7D0', text: '#166534'},
    error: {bg: '#FEE2E2', border: '#FECACA', text: '#991B1B'},
    warning: {bg: '#FEF3C7', border: '#FDE68A', text: '#92400E'},
    info: {bg: colors.cream, border: colors.border, text: colors.textSecondary},
  }[feedback.type];

  return (
    <View
      style={[
        styles.banner,
        {backgroundColor: palette.bg, borderColor: palette.border},
      ]}>
      <Text style={[styles.text, {color: palette.text}]}>{feedback.message}</Text>
      {onDismiss && feedback.type !== 'info' ? (
        <Text style={styles.dismiss} onPress={onDismiss}>
          Dismiss
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  dismiss: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
