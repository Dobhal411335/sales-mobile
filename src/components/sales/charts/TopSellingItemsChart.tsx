import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {TopItemPoint} from '../../../utils/salesDateFilters';

interface TopSellingItemsChartProps {
  data: TopItemPoint[];
}

export function TopSellingItemsChart({data}: TopSellingItemsChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.container}>
      {data.map((item, index) => {
        const isTop = index === 0 && item.count > 0;
        const pct = Math.max((item.count / maxCount) * 100, 4);

        return (
          <View key={`${item.name}-${index}`} style={styles.row}>
            <View style={styles.labelCol}>
              <Text
                style={[styles.itemName, isTop && styles.itemNameTop]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {item.name}
              </Text>
            </View>

            <View style={styles.barCol}>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {width: `${pct}%`},
                    isTop ? styles.fillTop : styles.fillNormal,
                  ]}
                />
              </View>
            </View>

            <View style={styles.countBadge}>
              <Text style={[styles.countText, isTop && styles.countTextTop]}>
                {item.count}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelCol: {
    width: 110,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3f3f46',
  },
  itemNameTop: {
    fontWeight: '700',
    color: '#18181b',
  },
  barCol: {
    flex: 1,
  },
  track: {
    height: 10,
    backgroundColor: '#f4f4f5',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  fillTop: {
    backgroundColor: '#f97316',
  },
  fillNormal: {
    backgroundColor: '#cbd5e1',
  },
  countBadge: {
    minWidth: 24,
    alignItems: 'flex-end',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
  },
  countTextTop: {
    color: '#f97316',
  },
});
