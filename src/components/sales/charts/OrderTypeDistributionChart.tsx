import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, G} from 'react-native-svg';
import type {OrderTypeDistributionPoint} from '../../../utils/salesDateFilters';

interface OrderTypeDistributionChartProps {
  data: OrderTypeDistributionPoint[];
  size?: number;
}

export function OrderTypeDistributionChart({
  data,
  size = 120,
}: OrderTypeDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;

  return (
    <View style={styles.container}>
      <View style={[styles.chartWrapper, {width: size, height: size}]}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background track */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#f4f4f5"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {total > 0 &&
              data.map((item, index) => {
                const fraction = item.value / total;
                const strokeDash = fraction * circumference;
                const offset = accumulated * circumference;
                accumulated += fraction;

                return (
                  <Circle
                    key={`${item.name}-${index}`}
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                    strokeDashoffset={-offset}
                    fill="none"
                  />
                );
              })}
          </G>
        </Svg>

        <View style={styles.centerLabel}>
          <Text style={styles.totalNumber}>{total}</Text>
          <Text style={styles.totalText}>ORDERS</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((item) => (
          <View key={item.name} style={styles.legendItem}>
            <View
              style={[styles.legendDot, {backgroundColor: item.color}]}
            />
            <Text style={styles.legendText}>
              {item.name.toUpperCase()} ({item.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18181b',
  },
  totalText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#a1a1aa',
    letterSpacing: 0.5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#52525b',
  },
});
