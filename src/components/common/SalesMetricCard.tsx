import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors} from '../../constants/colors';

export interface SalesMetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode | string;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function SalesMetricCard({
  label,
  value,
  icon,
  count,
  style,
}: SalesMetricCardProps) {
  const isElement = React.isValidElement(icon);

  return (
    <View style={[styles.card, style]}>
      {icon ? (
        <View style={styles.iconWrap}>
          {isElement ? (
            icon
          ) : (
            <Text style={styles.icon}>{icon}</Text>
          )}
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
          {count !== undefined ? (
            <Text style={styles.labelCount}> · {count}</Text>
          ) : null}
        </Text>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 105,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 58,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: 14,
    color: colors.surface,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#18181B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  labelCount: {
    fontWeight: '700',
    color: '#18181B',
    textTransform: 'none',
  },
  value: {
    marginTop: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#18181B',
    fontVariant: ['tabular-nums'],
  },
});
