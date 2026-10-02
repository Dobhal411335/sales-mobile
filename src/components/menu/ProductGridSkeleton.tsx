import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, View, useWindowDimensions} from 'react-native';
import {SkeletonBlock} from '../common/SkeletonBlock';
import {colors} from '../../constants/colors';
import type {GridCols, ItemStyle} from '../../types/product';

const LIST_PLACEHOLDER_COUNT = 8;
const TILE_PLACEHOLDER_COUNT = 12;

interface ProductGridSkeletonProps {
  itemStyle?: ItemStyle;
  gridCols?: GridCols;
}

function ListSkeletonCard() {
  return (
    <View style={styles.listCard}>
      <SkeletonBlock style={styles.listImage} />
      <View style={styles.listBody}>
        <SkeletonBlock style={styles.lineBadge} />
        <SkeletonBlock style={styles.lineTitle} />
        <SkeletonBlock style={styles.lineCategory} />
        <SkeletonBlock style={styles.linePrice} />
      </View>
    </View>
  );
}

function TileSkeletonCard() {
  return (
    <View style={styles.tileCard}>
      <SkeletonBlock style={styles.tileImage} />
      <View style={styles.tileBody}>
        <SkeletonBlock style={styles.tileLineTitle} />
        <SkeletonBlock style={styles.tileLinePrice} />
        <SkeletonBlock style={styles.tileLineAction} />
      </View>
    </View>
  );
}

export function ProductGridSkeleton({
  itemStyle = 'list',
  gridCols = 2,
}: ProductGridSkeletonProps) {
  const {width} = useWindowDimensions();

  const numColumns = useMemo(() => {
    if (itemStyle === 'tiles') {
      return gridCols;
    }
    return width >= 1100 ? 2 : 1;
  }, [itemStyle, gridCols, width]);

  const count =
    itemStyle === 'tiles' ? TILE_PLACEHOLDER_COUNT : LIST_PLACEHOLDER_COUNT;
  const placeholders = useMemo(
    () => Array.from({length: count}, (_, i) => `sk-${i}`),
    [count],
  );

  if (itemStyle === 'tiles') {
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
        <View key={row.join('-')} style={styles.listRow}>
          {row.map((key) => (
            <View key={key} style={styles.listCell}>
              <ListSkeletonCard />
            </View>
          ))}
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
  listRow: {
    flexDirection: 'row',
  },
  listCell: {
    flex: 1,
    minWidth: 0,
  },
  listCard: {
    flex: 1,
    minHeight: 96,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    margin: 6,
  },
  listImage: {
    width: 128,
    alignSelf: 'stretch',
    borderRadius: 0,
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
  },
  listBody: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  lineBadge: {
    width: 48,
    height: 14,
    borderRadius: 6,
  },
  lineTitle: {
    width: '85%',
    height: 16,
  },
  lineCategory: {
    width: '55%',
    height: 12,
  },
  linePrice: {
    width: 72,
    height: 16,
    marginTop: 4,
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
    aspectRatio: 4 / 3,
    borderRadius: 0,
  },
  tileBody: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  tileLineTitle: {
    width: '80%',
    height: 14,
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
