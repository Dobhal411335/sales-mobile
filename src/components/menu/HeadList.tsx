import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {FloorTabIcon} from '../common/Icons';
import {colors} from '../../constants/colors';
import type {MenuHead} from '../../types/product';

interface HeadListProps {
  heads: MenuHead[];
  activeHead: string;
  onSelectHead: (head: string) => void;
}

function HeadPlaceholder({name, active}: {name: string; active: boolean}) {
  const color = active ? colors.primary : colors.textSecondary;
  if (name === 'All') {
    return <FloorTabIcon size={28} color={color} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.placeholder, active && styles.placeholderActive]}>
      <Text style={[styles.placeholderText, active && styles.placeholderTextActive]}>
        {initial}
      </Text>
    </View>
  );
}

export function HeadList({heads, activeHead, onSelectHead}: HeadListProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {heads.map((head) => {
          const active = head.name === activeHead;
          return (
            <Pressable
              key={head.id}
              style={({pressed}) => [
                styles.card,
                active && styles.cardActive,
                pressed && !active && styles.cardPressed,
              ]}
              onPress={() => onSelectHead(head.name)}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              accessibilityLabel={head.name}>
              {head.imageUrl ? (
                <Image
                  source={{uri: head.imageUrl}}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.iconSlot}>
                  <HeadPlaceholder name={head.name} active={active} />
                </View>
              )}
              <Text
                style={[styles.label, active && styles.labelActive]}
                numberOfLines={2}>
                {head.name}
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
  card: {
    minWidth: 88,
    maxWidth: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
  },
  cardPressed: {
    backgroundColor: colors.primaryLight,
  },
  image: {
    width: 76,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  iconSlot: {
    width: 76,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFEDD5',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  placeholderTextActive: {
    color: colors.primary,
  },
  label: {
    marginTop: 4,
    paddingHorizontal: 2,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: colors.textSecondary,
  },
  labelActive: {
    color: '#C2410C',
  },
});
