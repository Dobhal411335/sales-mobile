import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';

interface CategoryListProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryList({
  categories,
  activeCategory,
  onSelectCategory,
}: CategoryListProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {categories.map((category) => {
          const active = category === activeCategory;
          return (
            <Pressable
              key={category}
              style={({pressed}) => [
                styles.tab,
                active && styles.tabActive,
                pressed && !active && styles.tabPressed,
              ]}
              onPress={() => onSelectCategory(category)}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              accessibilityLabel={category}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPressed: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.surface,
  },
});
