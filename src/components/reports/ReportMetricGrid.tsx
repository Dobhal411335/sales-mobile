import React from 'react';
import {StyleSheet, View} from 'react-native';

interface ReportMetricGridProps {
  children: React.ReactNode;
}

export function ReportMetricGrid({children}: ReportMetricGridProps) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
