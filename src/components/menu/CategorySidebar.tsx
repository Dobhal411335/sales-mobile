import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';

interface CategorySidebarProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategorySidebar({
  categories,
  activeCategory,
  onSelectCategory,
}: CategorySidebarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Categories</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {categories.map((category) => {
          const active = category === activeCategory;
          return (
            <Pressable
              key={category}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => onSelectCategory(category)}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              accessibilityLabel={category}>
              <Text
                style={[styles.itemText, active && styles.itemTextActive]}
                numberOfLines={2}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 148,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: 4,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  itemActive: {
    backgroundColor: '#FFF7ED',
    borderLeftColor: colors.primary,
  },
  itemText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 16,
  },
  itemTextActive: {
    color: '#9A3412',
  },
});
