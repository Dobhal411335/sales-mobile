import React from 'react';
import {StyleSheet, Text, View, type ViewStyle} from 'react-native';

interface DayCloseBlockerCardProps {
  title: string;
  count: number;
  tone?: 'warning' | 'danger';
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
}

export function DayCloseBlockerCard({
  title,
  count,
  tone = 'warning',
  children,
  footer,
  style,
}: DayCloseBlockerCardProps) {
  const toneStyles =
    tone === 'danger' ? styles.dangerCard : styles.warningCard;
  const titleStyles =
    tone === 'danger' ? styles.dangerTitle : styles.warningTitle;

  return (
    <View style={[styles.card, toneStyles, style]}>
      <Text style={[styles.title, titleStyles]}>
        {count} {title}
      </Text>
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  warningCard: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  dangerCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF1F2',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  warningTitle: {
    color: '#78350F',
  },
  dangerTitle: {
    color: '#881337',
  },
  body: {
    gap: 10,
  },
  footer: {
    marginTop: 4,
  },
});
