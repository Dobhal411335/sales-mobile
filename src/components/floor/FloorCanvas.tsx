import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import {colors} from '../../constants/colors';
import type {Floor, FloorTable, GridMode, TableSession} from '../../types/table';
import {computeContentBounds, computeFitScale} from '../../utils/floorLayout';
import {
  findSessionForTable,
  getTableCardSize,
  resolveTableDisplayStatus,
} from '../../utils/tableStatus';
import {TableCard} from './TableCard';

interface FloorCanvasProps {
  activeFloor: Floor | null;
  tables: FloorTable[];
  sessions: TableSession[];
  gridMode: GridMode;
  currentUserId: string | null;
  selectedTableId: string | null;
  loading: boolean;
  onTablePress: (table: FloorTable, session: TableSession | null) => void;
}

function LinesGrid() {
  const lines = Array.from({length: 20});
  return (
    <View style={styles.gridOverlay} pointerEvents="none">
      {lines.map((_, index) => (
        <React.Fragment key={`grid-${index}`}>
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

function DotsGrid() {
  const dots = Array.from({length: 16});
  return (
    <View style={styles.gridOverlay} pointerEvents="none">
      {dots.map((_, row) =>
        dots.map((__, col) => (
          <View
            key={`dot-${row}-${col}`}
            style={[
              styles.gridDot,
              {
                left: `${(col / dots.length) * 100}%`,
                top: `${(row / dots.length) * 100}%`,
              },
            ]}
          />
        )),
      )}
    </View>
  );
}

export function FloorCanvas({
  activeFloor,
  tables,
  sessions,
  gridMode,
  currentUserId,
  selectedTableId,
  loading,
  onTablePress,
}: FloorCanvasProps) {
  const [viewport, setViewport] = useState({width: 0, height: 0});

  const floorWidth = activeFloor?.width ?? 1200;
  const floorHeight = activeFloor?.height ?? 800;

  const contentBounds = useMemo(
    () => computeContentBounds(tables, floorWidth, floorHeight),
    [tables, floorWidth, floorHeight],
  );

  const scale = useMemo(() => {
    if (!viewport.width || !viewport.height) {
      return 1;
    }
    return computeFitScale(
      viewport.width,
      viewport.height,
      contentBounds.width,
      contentBounds.height,
    );
  }, [viewport.width, viewport.height, contentBounds.width, contentBounds.height]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setViewport({width, height});
  };

  return (
    <View style={styles.viewport} onLayout={handleLayout}>
      {loading && tables.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.centerWrap}>
          <View
            style={{
              width: contentBounds.width * scale,
              height: contentBounds.height * scale,
            }}>
            <View
              style={[
                styles.canvas,
                {
                  width: contentBounds.width,
                  height: contentBounds.height,
                  transform: [{scale}],
                },
              ]}>
              {gridMode === 'lines' ? <LinesGrid /> : null}
              {gridMode === 'dots' ? <DotsGrid /> : null}

              {tables.map((table) => {
                const session = findSessionForTable(sessions, table.id);
                const status = resolveTableDisplayStatus(session, currentUserId);
                const cardSize = getTableCardSize(table);
                const left =
                  (table.x || 0) -
                  contentBounds.offsetX -
                  cardSize.width * 0.1;
                const top =
                  (table.y || 0) -
                  contentBounds.offsetY -
                  cardSize.height * 0.1;

                return (
                  <View
                    key={table.id}
                    style={[
                      styles.tablePosition,
                      {
                        left,
                        top,
                        width: cardSize.width,
                        height: cardSize.height,
                      },
                    ]}>
                    <TableCard
                      table={table}
                      session={session}
                      status={status}
                      currentUserId={currentUserId}
                      selected={selectedTableId === table.id}
                      onPress={() => onTablePress(table, session)}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {loading && tables.length > 0 ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    backgroundColor: '#F4F4F5',
    padding: 8,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: 12,
    overflow: 'hidden',
    transformOrigin: 'top left',
  },
  linesGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#9CA3AF',
    opacity: 0.35,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#9CA3AF',
    opacity: 0.35,
  },
  gridDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#64748B',
    opacity: 0.55,
  },
  tablePosition: {
    position: 'absolute',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
