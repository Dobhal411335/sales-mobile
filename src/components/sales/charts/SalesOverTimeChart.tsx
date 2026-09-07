import React, {useState} from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line as SvgLine,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import {formatCurrency} from '../../../utils/currency';
import type {HourlySalesPoint} from '../../../utils/salesDateFilters';

interface SalesOverTimeChartProps {
  data: HourlySalesPoint[];
  height?: number;
}

export function SalesOverTimeChart({
  data,
  height = 200,
}: SalesOverTimeChartProps) {
  const [containerWidth, setContainerWidth] = useState(320);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const chartData = data.length > 0 ? data : [{time: 'Now', sales: 0}];

  const paddingLeft = 44;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 32;

  const innerWidth = Math.max(containerWidth - paddingLeft - paddingRight, 100);
  const innerHeight = Math.max(height - paddingTop - paddingBottom, 60);

  const maxVal = Math.max(
    ...chartData.map((d) => d.sales),
    10,
  );

  const getX = (index: number) => {
    if (chartData.length === 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (chartData.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return paddingTop + innerHeight - (val / maxVal) * innerHeight;
  };

  const points = chartData.map((d, index) => ({
    x: getX(index),
    y: getY(d.sales),
    data: d,
  }));

  // Create smooth curved SVG path
  let pathD = '';
  let areaD = '';

  if (points.length === 1) {
    const p = points[0];
    pathD = `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`;
    areaD = `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${
      paddingTop + innerHeight
    } L ${p.x - 20} ${paddingTop + innerHeight} Z`;
  } else {
    // Generate Catmull-Rom or Bezier curve
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const baselineY = paddingTop + innerHeight;
    areaD = `${pathD} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  }

  // Y-axis tick intervals (3 ticks: 0, 50%, 100%)
  const yTicks = [
    {val: 0, y: paddingTop + innerHeight},
    {val: maxVal / 2, y: paddingTop + innerHeight / 2},
    {val: maxVal, y: paddingTop},
  ];

  const selectedPoint =
    selectedIndex !== null && chartData[selectedIndex]
      ? {
          ...points[selectedIndex],
          data: chartData[selectedIndex],
        }
      : null;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {selectedPoint && (
        <View
          style={[
            styles.tooltip,
            {
              left: Math.min(
                Math.max(selectedPoint.x - 50, 10),
                containerWidth - 110,
              ),
              top: Math.max(selectedPoint.y - 38, 2),
            },
          ]}>
          <Text style={styles.tooltipTime}>{selectedPoint.data.time}</Text>
          <Text style={styles.tooltipValue}>
            {formatCurrency(selectedPoint.data.sales)}
          </Text>
        </View>
      )}

      <Svg width={containerWidth} height={height}>
        <Defs>
          <LinearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => (
          <G key={`tick-${i}`}>
            <SvgLine
              x1={paddingLeft}
              y1={tick.y}
              x2={containerWidth - paddingRight}
              y2={tick.y}
              stroke="#e4e4e7"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <SvgText
              x={paddingLeft - 6}
              y={tick.y + 4}
              fontSize="10"
              fontWeight="600"
              fill="#a1a1aa"
              textAnchor="end">
              {tick.val >= 1000
                ? `$${Math.round(tick.val / 1000)}k`
                : `$${Math.round(tick.val)}`}
            </SvgText>
          </G>
        ))}

        {/* Area fill */}
        <Path d={areaD} fill="url(#orangeGradient)" />

        {/* Line stroke */}
        <Path
          d={pathD}
          fill="none"
          stroke="#f97316"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Data points & interaction hits */}
        {points.map((p, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <G key={`point-${idx}`}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? 6 : 4}
                fill="#f97316"
                stroke="#FFFFFF"
                strokeWidth={isSelected ? 2.5 : 2}
              />
            </G>
          );
        })}

        {/* X-axis labels */}
        {chartData.map((d, idx) => {
          // Display a reasonable subset of labels if many points
          const step = Math.ceil(chartData.length / 6);
          const shouldShow =
            idx % step === 0 || idx === chartData.length - 1;
          if (!shouldShow) return null;

          return (
            <SvgText
              key={`xlabel-${idx}`}
              x={getX(idx)}
              y={height - 10}
              fontSize="10"
              fontWeight="500"
              fill="#71717a"
              textAnchor="middle">
              {d.time}
            </SvgText>
          );
        })}
      </Svg>

      {/* Invisible overlay buttons for easy touch selection */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.touchArea}>
          {points.map((p, idx) => (
            <Pressable
              key={`touch-${idx}`}
              onPress={() =>
                setSelectedIndex(selectedIndex === idx ? null : idx)
              }
              style={[
                styles.touchColumn,
                {
                  left: p.x - 18,
                  top: paddingTop,
                  height: innerHeight + paddingBottom,
                },
              ]}
              hitSlop={8}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#18181b',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipTime: {
    fontSize: 9,
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
  },
  tooltipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  touchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  touchColumn: {
    position: 'absolute',
    width: 36,
  },
});
