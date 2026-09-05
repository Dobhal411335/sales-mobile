import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import {ChevronDownIcon} from '../common/Icons';
import {colors} from '../../constants/colors';

interface MenuListFiltersProps {
  categories: string[];
  activeCategory: string;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  onSelectCategory: (category: string) => void;
}

export function MenuListFilters({
  categories,
  activeCategory,
  searchQuery,
  onChangeSearch,
  onSelectCategory,
}: MenuListFiltersProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={onChangeSearch}
          accessibilityLabel="Search menu items"
        />
      </View>

      <Pressable
        style={styles.selectButton}
        onPress={() => setPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Select category">
        <Text style={styles.selectValue} numberOfLines={1}>
          {activeCategory || 'Select a category'}
        </Text>
        <ChevronDownIcon size={14} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Category</Text>
            <ScrollView style={styles.pickerList}>
              {categories.map((category) => {
                const active = category === activeCategory;
                return (
                  <Pressable
                    key={category}
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => {
                      onSelectCategory(category);
                      setPickerOpen(false);
                    }}>
                    <Text
                      style={[
                        styles.pickerItemText,
                        active && styles.pickerItemTextActive,
                      ]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: 8,
  },
  selectButton: {
    width: 200,
    maxWidth: '42%',
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    paddingVertical: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pickerList: {
    paddingHorizontal: 8,
  },
  pickerItem: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  pickerItemActive: {
    backgroundColor: '#FFF7ED',
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  pickerItemTextActive: {
    fontWeight: '800',
    color: colors.primary,
  },
});
