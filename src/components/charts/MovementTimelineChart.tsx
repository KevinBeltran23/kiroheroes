import React, { useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeTouchEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Canvas,
  Circle,
  Line,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';

export interface MovementTimelinePoint {
  time: number;
  finger: number;
  wrist: number;
  arm: number;
}

interface MovementTimelineChartProps {
  data: MovementTimelinePoint[];
  currentTime: number;
  duration: number;
  onScrub?: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

const colors = {
  background: '#070A0E',
  border: '#27313B',
  grid: '#1A222B',
  text: '#9AA5B1',
  primaryText: '#F4F7FA',
  finger: '#2E8BFF',
  wrist: '#38C55D',
  arm: '#F2B705',
  playhead: '#FFFFFF',
};

const chartHeight = 156;
const topInset = 12;
const rightInset = 8;
const bottomInset = 28;
const leftInset = 32;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number) {
  return `${Math.round(seconds)}s`;
}

function valueToY(value: number, height: number) {
  const plotHeight = height - topInset - bottomInset;
  return topInset + (1 - clamp(value, 0, 100) / 100) * plotHeight;
}

function timeToX(time: number, width: number, duration: number) {
  const plotWidth = Math.max(1, width - leftInset - rightInset);
  return (
    leftInset + (clamp(time, 0, duration) / Math.max(duration, 1)) * plotWidth
  );
}

function buildSmoothPath(
  points: MovementTimelinePoint[],
  key: 'finger' | 'wrist' | 'arm',
  width: number,
  duration: number,
) {
  const path = Skia.Path.Make();
  if (!points.length || width <= 0) {
    return path;
  }

  const coords = points.map(point => ({
    x: timeToX(point.time, width, duration),
    y: valueToY(point[key], chartHeight),
  }));

  path.moveTo(coords[0].x, coords[0].y);
  for (let index = 1; index < coords.length; index += 1) {
    const prev = coords[index - 1];
    const current = coords[index];
    const controlDistance = (current.x - prev.x) / 2;
    path.cubicTo(
      prev.x + controlDistance,
      prev.y,
      current.x - controlDistance,
      current.y,
      current.x,
      current.y,
    );
  }

  return path;
}

function normalizeData(data: MovementTimelinePoint[], duration: number) {
  if (data.length) {
    return data;
  }

  return Array.from({ length: 5 }).map((_, index) => ({
    time: (duration || 24) * (index / 4),
    finger: 0,
    wrist: 0,
    arm: 0,
  }));
}

export default function MovementTimelineChart({
  data,
  currentTime,
  duration,
  onScrub,
  onScrubStart,
  onScrubEnd,
}: MovementTimelineChartProps) {
  const [width, setWidth] = useState(1);
  const chartRef = useRef<View>(null);
  const chartLeft = useRef(0);
  const normalizedDuration = Math.max(
    duration,
    data[data.length - 1]?.time ?? 24,
    1,
  );
  const points = normalizeData(data, normalizedDuration);
  const plotBottom = chartHeight - bottomInset;
  const playheadX = timeToX(currentTime, width, normalizedDuration);
  const labels = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => ({
        time: normalizedDuration * (index / 4),
        x: timeToX(normalizedDuration * (index / 4), width, normalizedDuration),
      })),
    [normalizedDuration, width],
  );

  const scrubFromX = (x: number) => {
    if (!onScrub) {
      return;
    }
    const plotWidth = Math.max(1, width - leftInset - rightInset);
    const progress = clamp((x - leftInset) / plotWidth, 0, 1);
    onScrub(progress * normalizedDuration);
  };

  const measureAndScrub = (event: NativeTouchEvent) => {
    chartRef.current?.measure((_x, _y, measuredWidth, _h, pageX) => {
      chartLeft.current = pageX;
      setWidth(Math.max(1, measuredWidth));
      scrubFromX(event.pageX - pageX);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => !!onScrub,
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => !!onScrub,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => {
          onScrubStart?.();
          measureAndScrub(event.nativeEvent);
        },
        onPanResponderMove: (event, gestureState) => {
          const measuredX = gestureState.moveX - chartLeft.current;
          const fallbackX = event.nativeEvent.locationX;
          scrubFromX(chartLeft.current ? measuredX : fallbackX);
        },
        onPanResponderRelease: () => {
          onScrubEnd?.();
        },
        onPanResponderTerminate: () => {
          onScrubEnd?.();
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [normalizedDuration, onScrub, onScrubEnd, onScrubStart, width],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(Math.max(1, event.nativeEvent.layout.width));
    chartRef.current?.measure((_x, _y, _w, _h, pageX) => {
      chartLeft.current = pageX;
    });
  };

  const fingerPath = buildSmoothPath(
    points,
    'finger',
    width,
    normalizedDuration,
  );
  const wristPath = buildSmoothPath(points, 'wrist', width, normalizedDuration);
  const armPath = buildSmoothPath(points, 'arm', width, normalizedDuration);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contribution Over Time</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.finger }]} />
            <Text style={styles.legendText}>Finger</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.wrist }]} />
            <Text style={styles.legendText}>Wrist</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.arm }]} />
            <Text style={styles.legendText}>Arm</Text>
          </View>
        </View>
      </View>

      <View
        ref={chartRef}
        style={styles.chart}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <Canvas pointerEvents="none" style={styles.canvas}>
          {[0, 25, 50, 75, 100].map(value => (
            <Line
              key={value}
              p1={vec(leftInset, valueToY(value, chartHeight))}
              p2={vec(width - rightInset, valueToY(value, chartHeight))}
              color={colors.grid}
              strokeWidth={1}
            />
          ))}
          <Path
            path={fingerPath}
            color={colors.finger}
            style="stroke"
            strokeWidth={2.5}
          />
          <Path
            path={wristPath}
            color={colors.wrist}
            style="stroke"
            strokeWidth={2.5}
          />
          <Path
            path={armPath}
            color={colors.arm}
            style="stroke"
            strokeWidth={2.5}
          />
          <Line
            p1={vec(playheadX, topInset)}
            p2={vec(playheadX, plotBottom)}
            color={colors.playhead}
            strokeWidth={2}
          />
          <Circle cx={playheadX} cy={topInset} r={5} color={colors.playhead} />
        </Canvas>

        <View style={styles.yLabels} pointerEvents="none">
          {[100, 75, 50, 25, 0].map(value => (
            <Text key={value} style={styles.axisText}>
              {value}%
            </Text>
          ))}
        </View>
        {labels.map(label => (
          <Text
            key={label.time}
            style={[styles.xLabel, { left: label.x - 12 }]}
            pointerEvents="none"
          >
            {formatTime(label.time)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 7,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    borderRadius: 99,
    height: 7,
    width: 7,
  },
  legendText: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  chart: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.grid,
    borderTopWidth: 1,
    height: chartHeight,
    position: 'relative',
  },
  canvas: {
    height: chartHeight,
    width: '100%',
  },
  yLabels: {
    bottom: bottomInset - 7,
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    top: topInset - 8,
    width: leftInset - 5,
  },
  axisText: {
    color: colors.text,
    fontSize: 10,
    textAlign: 'right',
  },
  xLabel: {
    bottom: 5,
    color: colors.text,
    fontSize: 10,
    position: 'absolute',
    width: 32,
  },
});
