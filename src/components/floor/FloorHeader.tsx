import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../constants/colors';
import type {Floor, GridMode} from '../../types/table';
import {FloorSelector} from './FloorSelector';

interface FloorHeaderProps {
  floorName: string;
  tableCount: number;
  activeSessionCount: number;
  activeOrderCount: number;
  floors: Floor[];
  selectedFloorId: string | null;
  gridMode: GridMode;
  onSelectFloor: (floorId: string) => void;
  onToggleGrid: () => void;
}

function getGridLabel(gridMode: GridMode): string {
  if (gridMode === 'lines') {
    return 'Lines';
  }
  if (gridMode === 'dots') {
    return 'Dots';
  }
  return 'Grid Off';
}

export function FloorHeader({
  floorName,
  tableCount,
  activeSessionCount,
  activeOrderCount,
  floors,
  selectedFloorId,
  gridMode,
  onSelectFloor,
  onToggleGrid,
}: FloorHeaderProps) {
  const subtitleParts = [
    floorName,
    `${tableCount} Tables`,
    `${activeSessionCount} Active`,
  ];

  if (activeOrderCount > 0) {
    subtitleParts.push(`${activeOrderCount} With Orders`);
  }

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={styles.title}>Floor Operations</Text>
        <Text style={styles.subtitle}>{subtitleParts.join(' · ')}</Text>
      </View>

      <View style={styles.right}>
        <FloorSelector
          floors={floors}
          selectedFloorId={selectedFloorId}
          onSelectFloor={onSelectFloor}
        />

        <Pressable
          style={({pressed}) => [
            styles.gridButton,
            gridMode !== 'none' && styles.gridButtonActive,
            pressed && styles.gridButtonPressed,
          ]}
          onPress={onToggleGrid}
          accessibilityRole="button"
          accessibilityLabel={`Grid mode ${getGridLabel(gridMode)}`}>
          <Text
            style={[
              styles.gridButtonText,
              gridMode !== 'none' && styles.gridButtonTextActive,
            ]}>
            {getGridLabel(gridMode)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  gridButton: {
    minHeight: 44,
    minWidth: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  gridButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gridButtonPressed: {
    opacity: 0.9,
  },
  gridButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  gridButtonTextActive: {
    color: colors.surface,
  },
});
