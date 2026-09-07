import React from 'react';
import {Pressable, StyleSheet, Text, ScrollView} from 'react-native';
import type {TodayOrderFilter} from '../../types/todayOrder';
import {TODAY_ORDER_FILTERS} from '../../utils/todayOrderHelpers';

interface OrderFilterChipsProps {
  activeFilter: TodayOrderFilter;
  onFilterChange: (filter: TodayOrderFilter) => void;
}

export function OrderFilterChips({
  activeFilter,
  onFilterChange,
}: OrderFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {TODAY_ORDER_FILTERS.map((filter) => {
        const selected = activeFilter === filter;
        return (
          <Pressable
            key={filter}
            style={({pressed}) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && !selected && styles.chipPressed,
            ]}
            onPress={() => onFilterChange(filter)}
            accessibilityRole="button"
            accessibilityState={{selected}}
            accessibilityLabel={`Filter ${filter}`}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {filter}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#18181B',
    borderColor: '#18181B',
  },
  chipPressed: {
    backgroundColor: '#D4D4D8',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
