import React from 'react';
import {Pressable, StyleSheet, Text, View, ScrollView} from 'react-native';
import {colors} from '../../constants/colors';
import type {PrintJobFilter} from '../../types/printJob';
import {filterDisplayLabel, PRINT_JOB_FILTERS} from '../../types/printJob';

interface PrintJobFiltersProps {
  activeFilter: PrintJobFilter;
  onFilterChange: (filter: PrintJobFilter) => void;
}

export function PrintJobFilters({
  activeFilter,
  onFilterChange,
}: PrintJobFiltersProps) {
  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}>
        {PRINT_JOB_FILTERS.map((filter) => {
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
              accessibilityLabel={`Filter ${filterDisplayLabel(filter)}`}>
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
                numberOfLines={1}>
                {filterDisplayLabel(filter)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
    flexShrink: 0,
    height: 52,
    justifyContent: 'center',
    marginBottom: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  chip: {
    height: 44,
    flexShrink: 0,
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
    textAlign: 'center',
  },
  chipTextSelected: {
    color: colors.surface,
  },
});
