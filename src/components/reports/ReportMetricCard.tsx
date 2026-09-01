import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';

interface ReportMetricCardProps {
  label: string;
  value: string;
}

export function ReportMetricCard({label, value}: ReportMetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
