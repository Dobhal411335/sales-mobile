import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {PrintJobStatus} from '../../types/printJob';

interface PrintJobStatusBadgeProps {
  status: PrintJobStatus;
  compact?: boolean;
}

function statusStyle(status: PrintJobStatus) {
  switch (status) {
    case 'QUEUED':
      return {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
        color: '#92400E',
      };
    case 'PRINTING':
      return {
        backgroundColor: '#E0F2FE',
        borderColor: colors.serving,
        color: '#075985',
      };
    case 'PRINTED':
      return {
        backgroundColor: '#DCFCE7',
        borderColor: colors.success,
        color: '#166534',
      };
    case 'FAILED':
      return {
        backgroundColor: '#FEE2E2',
        borderColor: colors.error,
        color: '#991B1B',
      };
    case 'CANCELLED':
    default:
      return {
        backgroundColor: '#F4F4F5',
        borderColor: colors.border,
        color: colors.textSecondary,
      };
  }
}

export function PrintJobStatusBadge({
  status,
  compact = false,
}: PrintJobStatusBadgeProps) {
  const palette = statusStyle(status);
  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
      accessibilityLabel={`Status ${status}`}>
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          {color: palette.color},
        ]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  textCompact: {
    fontSize: 10,
  },
});
