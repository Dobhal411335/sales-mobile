import React from 'react';
import {Pressable, StyleSheet, Text, ScrollView} from 'react-native';
import {colors} from '../../constants/colors';
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
    paddingVertical: 4,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.surface,
  },
});
