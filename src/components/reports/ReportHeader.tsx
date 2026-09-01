import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';

interface ReportHeaderProps {
  saved: boolean;
}

export function ReportHeader({saved}: ReportHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>End-of-Day Report</Text>
        <Text style={styles.subtitle}>
          View, export, or email the End-of-Day report for any business day.
          Independent of Close Restaurant.
        </Text>
      </View>
      <View style={[styles.badge, saved ? styles.badgeSaved : styles.badgeLive]}>
        <Text style={[styles.badgeText, saved ? styles.badgeTextSaved : styles.badgeTextLive]}>
          {saved ? 'Saved snapshot' : 'Live data'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeLive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  badgeSaved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  badgeTextLive: {
    color: colors.textSecondary,
  },
  badgeTextSaved: {
    color: '#166534',
  },
});
