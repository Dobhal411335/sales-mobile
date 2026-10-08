import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SkeletonBlock} from '../common/SkeletonBlock';
import {colors} from '../../constants/colors';
import type {GridCols} from '../../types/product';

const TILE_PLACEHOLDER_COUNT = 12;

interface ProductGridSkeletonProps {
  gridCols?: GridCols;
}

function TileSkeletonCard() {
  return (
    <View style={styles.tileCard}>
      <SkeletonBlock style={styles.tileImage} />
      <View style={styles.tileBody}>
        <SkeletonBlock style={styles.tileLineTitle} />
        <View style={styles.tilePriceRow}>
          <SkeletonBlock style={styles.tileLinePrice} />
          <SkeletonBlock style={styles.tileLineAction} />
        </View>
      </View>
    </View>
  );
}

export function ProductGridSkeleton({gridCols = 4}: ProductGridSkeletonProps) {
  const numColumns = gridCols;
  const placeholders = useMemo(
    () => Array.from({length: TILE_PLACEHOLDER_COUNT}, (_, i) => `sk-${i}`),
    [],
  );

  const rows: string[][] = [];
  for (let i = 0; i < placeholders.length; i += numColumns) {
    rows.push(placeholders.slice(i, i + numColumns));
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}>
      {rows.map((row) => (
        <View key={row.join('-')} style={styles.tileRow}>
          {row.map((key) => (
            <View
              key={key}
              style={[styles.tileCell, {width: `${100 / numColumns}%`}]}>
              <TileSkeletonCard />
            </View>
          ))}
          {row.length < numColumns
            ? Array.from({length: numColumns - row.length}).map((_, i) => (
                <View
                  key={`pad-${i}`}
                  style={[styles.tileCell, {width: `${100 / numColumns}%`}]}
                />
              ))
            : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  listContent: {
    padding: 10,
    paddingBottom: 24,
  },
  tileRow: {
    flexDirection: 'row',
  },
  tileCell: {
    paddingHorizontal: 0,
  },
  tileCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 5,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  tileImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 0,
  },
  tileBody: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  tileLineTitle: {
    width: '80%',
    height: 14,
  },
  tilePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tileLinePrice: {
    width: 64,
    height: 16,
  },
  tileLineAction: {
    width: 56,
    height: 22,
    borderRadius: 8,
  },
});
