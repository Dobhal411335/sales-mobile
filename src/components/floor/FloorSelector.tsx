import React, {useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {colors} from '../../constants/colors';
import type {Floor} from '../../types/table';
import {Popover} from '../common/Popover';

interface FloorSelectorProps {
  floors: Floor[];
  selectedFloorId: string | null;
  onSelectFloor: (floorId: string) => void;
}

export function FloorSelector({
  floors,
  selectedFloorId,
  onSelectFloor,
}: FloorSelectorProps) {
  const [open, setOpen] = useState(false);
  const activeFloor =
    floors.find((floor) => floor.id === selectedFloorId) ?? floors[0];

  return (
    <>
      <Pressable
        style={({pressed}) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Select floor, current ${activeFloor?.name ?? 'floor'}`}>
        <Text style={styles.triggerText} numberOfLines={1}>
          {activeFloor?.name ?? 'Select floor'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Popover visible={open} onClose={() => setOpen(false)} align="end">
        <Text style={styles.title}>Select floor</Text>
        {floors.map((floor) => {
          const selected = floor.id === selectedFloorId;
          return (
            <Pressable
              key={floor.id}
              style={({pressed}) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
              onPress={() => {
                setOpen(false);
                onSelectFloor(floor.id);
              }}
              accessibilityRole="button"
              accessibilityState={{selected}}>
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}>
                {floor.name}
              </Text>
            </Pressable>
          );
        })}
      </Popover>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  triggerPressed: {
    backgroundColor: colors.cream,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  chevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  option: {
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionPressed: {
    opacity: 0.9,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primaryHover,
  },
});
