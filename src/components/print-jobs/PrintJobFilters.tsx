import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {RotateCcw, Search, X} from 'lucide-react-native';
import {colors} from '../../constants/colors';
import type {PrintJobFilter} from '../../types/printJob';

export const STATUS_OPTIONS = [
  {value: 'ALL', label: 'All Statuses'},
  {value: 'QUEUED', label: 'Queued'},
  {value: 'PRINTING', label: 'Printing'},
  {value: 'PRINTED', label: 'Printed'},
  {value: 'FAILED', label: 'Failed'},
  {value: 'CANCELLED', label: 'Cancelled'},
] as const;

export const TYPE_OPTIONS = [
  {value: 'ALL', label: 'All Types'},
  {value: 'RECEIPT', label: 'Receipt'},
  {value: 'KOT', label: 'KOT'},
  {value: 'BAR_RECEIPT', label: 'Bar'},
] as const;

export const TARGET_OPTIONS = [
  {value: 'ALL', label: 'All Targets'},
  {value: 'RECEIPT', label: 'Front'},
  {value: 'KITCHEN', label: 'Kitchen'},
  {value: 'COUNTER', label: 'Counter'},
] as const;

interface PrintJobFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  typeFilter: string;
  onTypeChange: (type: string) => void;
  targetFilter: string;
  onTargetChange: (target: string) => void;
  reprintOnly: boolean;
  onToggleReprintOnly?: () => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  activeFilter?: PrintJobFilter;
  onFilterChange?: (filter: PrintJobFilter) => void;
}

export function PrintJobFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  targetFilter,
  onTargetChange,
  hasActiveFilters,
  onResetFilters,
}: PrintJobFiltersProps) {
  return (
    <View style={styles.container}>
      {/* Search Input Row & Reset Action */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Order #..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => onSearchChange('')}
              hitSlop={8}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search">
              <X size={15} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>

        {hasActiveFilters && (
          <Pressable
            style={({pressed}) => [
              styles.resetBtn,
              pressed && styles.resetBtnPressed,
            ]}
            onPress={onResetFilters}
            accessibilityRole="button"
            accessibilityLabel="Reset filters">
            <RotateCcw size={13} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.resetBtnText}>Reset</Text>
          </Pressable>
        )}
      </View>

      {/* Horizontal Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}>
        {/* Status Chips */}
        {STATUS_OPTIONS.map((opt) => {
          const selected = statusFilter === opt.value;
          return (
            <Pressable
              key={`status-${opt.value}`}
              style={({pressed}) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !selected && styles.chipPressed,
              ]}
              onPress={() => onStatusChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{selected}}>
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        {/* Type Chips */}
        {TYPE_OPTIONS.map((opt) => {
          const selected = typeFilter === opt.value;
          return (
            <Pressable
              key={`type-${opt.value}`}
              style={({pressed}) => [
                styles.chip,
                styles.chipType,
                selected && styles.chipTypeSelected,
                pressed && !selected && styles.chipPressed,
              ]}
              onPress={() => onTypeChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{selected}}>
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        {/* Target Chips */}
        {TARGET_OPTIONS.map((opt) => {
          const selected = targetFilter === opt.value;
          return (
            <Pressable
              key={`target-${opt.value}`}
              style={({pressed}) => [
                styles.chip,
                styles.chipTarget,
                selected && styles.chipTargetSelected,
                pressed && !selected && styles.chipPressed,
              ]}
              onPress={() => onTargetChange(opt.value)}
              accessibilityRole="button"
              accessibilityState={{selected}}>
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 2,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resetBtnPressed: {
    backgroundColor: colors.cream,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
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
  chipType: {
    borderColor: '#E0E7FF',
  },
  chipTypeSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipTarget: {
    borderColor: '#F3E8FF',
  },
  chipTargetSelected: {
    backgroundColor: '#9333EA',
    borderColor: '#9333EA',
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.surface,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
});
