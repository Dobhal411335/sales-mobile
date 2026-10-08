import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {SkeletonBlock} from '../common/SkeletonBlock';
import {colors} from '../../constants/colors';

type SkeletonTable = {
  id: string;
  left: string;
  top: string;
  width: number;
  height: number;
  round?: boolean;
  delayMs: number;
};

/** Layout mimics a typical floor plan while data loads. */
const SKELETON_TABLES: SkeletonTable[] = [
  {id: 't1', left: '8%', top: '12%', width: 92, height: 78, delayMs: 0},
  {id: 't2', left: '28%', top: '10%', width: 88, height: 88, round: true, delayMs: 120},
  {id: 't3', left: '52%', top: '14%', width: 100, height: 76, delayMs: 240},
  {id: 't4', left: '74%', top: '12%', width: 86, height: 86, round: true, delayMs: 80},
  {id: 't5', left: '10%', top: '42%', width: 96, height: 80, delayMs: 180},
  {id: 't6', left: '34%', top: '44%', width: 90, height: 90, round: true, delayMs: 300},
  {id: 't7', left: '58%', top: '40%', width: 104, height: 78, delayMs: 60},
  {id: 't8', left: '78%', top: '46%', width: 88, height: 74, delayMs: 220},
  {id: 't9', left: '14%', top: '72%', width: 90, height: 76, delayMs: 140},
  {id: 't10', left: '38%', top: '70%', width: 98, height: 82, delayMs: 260},
  {id: 't11', left: '64%', top: '74%', width: 92, height: 92, round: true, delayMs: 100},
];

function PulsingCanvas({children}: {children: React.ReactNode}) {
  const opacity = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.88,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.canvas, {opacity}]}>{children}</Animated.View>
  );
}

function GridLines() {
  const lines = Array.from({length: 12});
  return (
    <View style={styles.gridOverlay} pointerEvents="none">
      {lines.map((_, index) => (
        <React.Fragment key={`sk-grid-${index}`}>
          <View
            style={[
              styles.gridLineVertical,
              {left: `${(index / lines.length) * 100}%`},
            ]}
          />
          <View
            style={[
              styles.gridLineHorizontal,
              {top: `${(index / lines.length) * 100}%`},
            ]}
          />
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * Full-bleed floor canvas placeholder: floor surface + animated table cards.
 */
export function FloorCanvasSkeleton() {
  return (
    <View style={styles.viewport}>
      <PulsingCanvas>
        <GridLines />
        {SKELETON_TABLES.map((table) => (
          <View
            key={table.id}
            style={[
              styles.tableSlot,
              {
                left: table.left,
                top: table.top,
                width: table.width,
                height: table.height,
              },
            ]}>
            <SkeletonBlock
              style={[
                styles.tableBone,
                table.round ? styles.tableRound : styles.tableRect,
              ]}
            />
            <View style={styles.tableLabelRow} pointerEvents="none">
              <SkeletonBlock style={styles.tableLabelWide} />
              <SkeletonBlock style={styles.tableLabelNarrow} />
            </View>
            <SkeletonBlock style={styles.tableSeatLine} />
          </View>
        ))}
        <View style={styles.hintBar}>
          <SkeletonBlock style={styles.hintChip} />
          <SkeletonBlock style={styles.hintChipWide} />
        </View>
      </PulsingCanvas>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    padding: 8,
  },
  canvas: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#E4E4E7',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E4E4E7',
  },
  tableSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  tableBone: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ECECEE',
  },
  tableRect: {
    borderRadius: 10,
  },
  tableRound: {
    borderRadius: 999,
  },
  tableLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  tableLabelWide: {
    width: 36,
    height: 10,
    borderRadius: 4,
  },
  tableLabelNarrow: {
    width: 28,
    height: 8,
    borderRadius: 4,
  },
  tableSeatLine: {
    marginTop: 8,
    width: 48,
    height: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  hintBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    gap: 10,
  },
  hintChip: {
    width: 88,
    height: 22,
    borderRadius: 11,
  },
  hintChipWide: {
    width: 132,
    height: 22,
    borderRadius: 11,
  },
});
