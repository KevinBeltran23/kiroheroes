import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Video from 'react-native-video';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import {
  useAnalysisResultQuery,
  useLiveAnalysisResult,
  useSessionQuery,
} from '../../services/store/analysisQueries';
import { getStorageDownloadUrl } from '../../services/firebase';
import { AnalysisResult } from '../../types';
import MovementTimelineChart, {
  MovementTimelinePoint,
} from '../../components/charts/MovementTimelineChart';

const dashboard = {
  bg: '#060A10',
  panel: '#0D1219',
  panel2: '#111820',
  border: '#1A2233',
  text: '#F0F2F5',
  muted: '#7B8BA3',
  blue: '#3B7BF6',
  green: '#38C55D',
  gold: '#F2B705',
};

function percent(value?: number) {
  return `${Math.round(value ?? 0)}%`;
}

function metricFromResult(
  result: AnalysisResult,
  id: string,
  fallback: number,
) {
  return result.metrics.find(metric => metric.id === id)?.value ?? fallback;
}

function interpolateTimelineValue(
  data: MovementTimelinePoint[],
  time: number,
  key: 'bicep' | 'forearm' | 'wristBreak',
) {
  if (!data.length) {
    return 0;
  }
  if (time <= data[0].time) {
    return data[0][key];
  }

  for (let index = 1; index < data.length; index += 1) {
    const previous = data[index - 1];
    const current = data[index];
    if (time <= current.time) {
      const span = Math.max(current.time - previous.time, 0.001);
      const progress = (time - previous.time) / span;
      return previous[key] + (current[key] - previous[key]) * progress;
    }
  }

  return data[data.length - 1][key];
}

function averageTimelineValue(
  data: MovementTimelinePoint[],
  key: 'bicep' | 'forearm' | 'wristBreak',
  fallback: number,
) {
  if (!data.length) {
    return fallback;
  }
  return data.reduce((sum, point) => sum + point[key], 0) / data.length;
}

function useVideoUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStorageDownloadUrl(path)
      .then(nextUrl => {
        if (!cancelled) setUrl(nextUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}

function MuscleTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const s = StyleSheet.create({
    tile: {
      flex: 1,
      minWidth: '31%',
      backgroundColor: dashboard.panel,
      borderColor: dashboard.border,
      borderWidth: 1,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(12),
    },
    label: {
      color,
      fontSize: scaleFont(12),
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: scaleHeight(4),
    },
    value: { color, fontSize: scaleFont(28), fontWeight: '900' },
  });
  return (
    <View style={s.tile}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{percent(value)}</Text>
    </View>
  );
}

function ResultsContent({
  result,
  videoUrl,
  projectName,
}: {
  result: AnalysisResult;
  videoUrl: string | null;
  projectName: string;
}) {
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const [scrubProgress, setScrubProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoFrameRate, setVideoFrameRate] = useState(30);
  const [showFrameValues, setShowFrameValues] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState<{
    bicep: number;
    forearm: number;
    wristBreak: number;
  } | null>(null);
  const isGraphDraggingRef = useRef(false);
  const isVideoPlayingRef = useRef(false);
  const wasPlayingBeforeGraphDragRef = useRef(false);
  const videoRef = useRef<any>(null);
  const averageSectionUsage = {
    bicep: metricFromResult(
      result,
      'bicep_usage',
      result.muscleUsage?.bicep ?? metricFromResult(result, 'arm_usage', 28),
    ),
    forearm: metricFromResult(result, 'forearm_usage', 52),
    wristBreak: metricFromResult(
      result,
      'wrist_break_usage',
      result.muscleUsage?.wristBreak ??
        metricFromResult(result, 'wrist_usage', 20),
    ),
  };
  const approach = result.approach ?? {
    category: 'Arm-Heavy' as const,
    confidence: 62,
    summary:
      "You're using a lot of arm. Try focusing on smaller motions from the wrist to improve efficiency and control.",
  };
  const confidenceLevel =
    approach.confidence >= 75
      ? 'High'
      : approach.confidence >= 50
        ? 'Medium'
        : 'Low';
  const frameCount = Math.max(
    result.chartSeries.leftBicep?.length ??
      result.chartSeries.fingerUsage?.length ??
      0,
    result.chartSeries.leftForearm?.length ??
      result.chartSeries.wristUsage?.length ??
      0,
    result.chartSeries.leftWristBreak?.length ??
      result.chartSeries.armUsage?.length ??
      0,
    1,
  );
  const selectedIndex = Math.round(scrubProgress * Math.max(frameCount - 1, 1));
  const scrubSeconds = scrubProgress * videoDuration;
  const totalVideoFrames = Math.max(
    1,
    Math.round(videoDuration * videoFrameRate),
  );
  const chartData = useMemo<MovementTimelinePoint[]>(() => {
    const leftBicep = result.chartSeries.leftBicep;
    const rightBicep = result.chartSeries.rightBicep;
    const leftForearm = result.chartSeries.leftForearm;
    const rightForearm = result.chartSeries.rightForearm;
    const leftWristBreak = result.chartSeries.leftWristBreak;
    const rightWristBreak = result.chartSeries.rightWristBreak;
    const bicep = leftBicep?.length
      ? leftBicep.map((value, index) =>
          Math.max(value, rightBicep?.[index] ?? value),
        )
      : (result.chartSeries.fingerUsage ?? [28, 35, 31, 33, 30, 37, 34, 36]);
    const forearm = leftForearm?.length
      ? leftForearm.map((value, index) =>
          Math.max(value, rightForearm?.[index] ?? value),
        )
      : (result.chartSeries.wristUsage ?? [60, 66, 70, 68, 72, 69, 71, 68]);
    const wristBreak = leftWristBreak?.length
      ? leftWristBreak.map((value, index) =>
          Math.max(value, rightWristBreak?.[index] ?? value),
        )
      : (result.chartSeries.armUsage ?? [18, 13, 16, 12, 15, 17, 14, 18]);
    const count = Math.max(bicep.length, forearm.length, wristBreak.length, 1);
    const timelineDuration = videoDuration || count - 1 || 1;

    return Array.from({ length: count }).map((_, index) => ({
      time:
        count === 1 ? 0 : timelineDuration * (index / Math.max(count - 1, 1)),
      bicep: bicep[index] ?? bicep[bicep.length - 1] ?? 0,
      forearm: forearm[index] ?? forearm[forearm.length - 1] ?? 0,
      wristBreak: wristBreak[index] ?? wristBreak[wristBreak.length - 1] ?? 0,
    }));
  }, [
    result.chartSeries.armUsage,
    result.chartSeries.fingerUsage,
    result.chartSeries.leftBicep,
    result.chartSeries.leftForearm,
    result.chartSeries.leftWristBreak,
    result.chartSeries.rightBicep,
    result.chartSeries.rightForearm,
    result.chartSeries.rightWristBreak,
    result.chartSeries.wristUsage,
    videoDuration,
  ]);
  const derivedAverageUsage = {
    bicep: averageTimelineValue(chartData, 'bicep', averageSectionUsage.bicep),
    forearm: averageTimelineValue(
      chartData,
      'forearm',
      averageSectionUsage.forearm,
    ),
    wristBreak: averageTimelineValue(
      chartData,
      'wristBreak',
      averageSectionUsage.wristBreak,
    ),
  };
  const displayedUsage =
    showFrameValues && selectedUsage ? selectedUsage : derivedAverageUsage;

  const handleGraphScrub = (progress: number) => {
    const frameIndex = Math.round(
      Math.min(1, Math.max(0, progress / Math.max(videoDuration, 1))) *
        totalVideoFrames,
    );
    const frameAccurateTime = videoDuration
      ? Math.min(videoDuration, frameIndex / videoFrameRate)
      : progress;
    const normalizedProgress = videoDuration
      ? frameAccurateTime / videoDuration
      : frameAccurateTime /
        Math.max(chartData[chartData.length - 1]?.time ?? 1, 1);
    setSelectedUsage({
      bicep: interpolateTimelineValue(chartData, frameAccurateTime, 'bicep'),
      forearm: interpolateTimelineValue(
        chartData,
        frameAccurateTime,
        'forearm',
      ),
      wristBreak: interpolateTimelineValue(
        chartData,
        frameAccurateTime,
        'wristBreak',
      ),
    });
    setShowFrameValues(true);
    setScrubProgress(Math.min(1, Math.max(0, normalizedProgress)));
    if (videoDuration && videoRef.current) {
      videoRef.current.seek(frameAccurateTime);
    }
  };

  const handleVideoProgress = (currentTime: number) => {
    if (!videoDuration || isGraphDraggingRef.current) {
      return;
    }
    setScrubProgress(Math.min(1, Math.max(0, currentTime / videoDuration)));
  };

  const showAverageValues = () => {
    setShowFrameValues(false);
    setSelectedUsage(null);
  };

  const startGraphScrub = () => {
    setShowFrameValues(true);
    wasPlayingBeforeGraphDragRef.current = isVideoPlayingRef.current;
    isGraphDraggingRef.current = true;
    if (isVideoPlayingRef.current) {
      setVideoPaused(true);
    }
  };

  const endGraphScrub = () => {
    isGraphDraggingRef.current = false;
    if (wasPlayingBeforeGraphDragRef.current) {
      setVideoPaused(false);
    }
  };

  const s = StyleSheet.create({
    title: {
      color: dashboard.text,
      fontSize: scaleFont(19),
      fontWeight: '900',
    },
    meta: {
      color: dashboard.muted,
      fontSize: scaleFont(12),
      marginTop: scaleHeight(4),
    },
    videoShell: {
      marginTop: scaleHeight(16),
      height: scaleHeight(170),
      backgroundColor: '#0B1016',
      borderRadius: proportionalSize(8),
      overflow: 'hidden',
      borderColor: dashboard.border,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chartMode: {
      color: showFrameValues ? dashboard.text : dashboard.muted,
      fontSize: scaleFont(11),
      fontWeight: '700',
      marginTop: scaleHeight(7),
    },
    video: { width: '100%', height: '100%' },
    videoFallback: {
      color: dashboard.muted,
      fontSize: scaleFont(13),
      marginTop: scaleHeight(8),
    },
    row: {
      flexDirection: 'row',
      gap: proportionalSize(8),
      marginTop: scaleHeight(10),
    },
    approachPanel: {
      marginTop: scaleHeight(10),
      backgroundColor: dashboard.panel,
      borderRadius: proportionalSize(8),
      borderColor: dashboard.border,
      borderWidth: 1,
      flexDirection: 'row',
    },
    approachMain: {
      flex: 1.2,
      padding: proportionalSize(13),
      borderRightWidth: 1,
      borderRightColor: dashboard.border,
    },
    approachSide: { flex: 0.8, padding: proportionalSize(13) },
    eyebrow: {
      color: dashboard.muted,
      fontSize: scaleFont(10),
      fontWeight: '800',
    },
    approachTitle: {
      color: dashboard.gold,
      fontSize: scaleFont(19),
      fontWeight: '900',
      marginTop: scaleHeight(4),
    },
    confidence: {
      color: dashboard.gold,
      fontSize: scaleFont(12),
      fontWeight: '800',
      marginTop: scaleHeight(8),
    },
    summaryPanel: {
      marginTop: scaleHeight(10),
      backgroundColor: dashboard.panel,
      borderRadius: proportionalSize(8),
      borderColor: dashboard.border,
      borderWidth: 1,
      padding: proportionalSize(13),
    },
    body: {
      color: dashboard.text,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(19),
      marginTop: scaleHeight(7),
    },
    angleRow: {
      flexDirection: 'row',
      gap: proportionalSize(8),
      marginTop: scaleHeight(10),
    },
    angleCard: {
      flex: 1,
      backgroundColor: dashboard.panel2,
      borderRadius: proportionalSize(8),
      borderColor: dashboard.border,
      borderWidth: 1,
      padding: proportionalSize(11),
    },
    angleTitle: {
      color: dashboard.text,
      fontSize: scaleFont(12),
      fontWeight: '900',
    },
    angleText: {
      color: dashboard.muted,
      fontSize: scaleFont(11),
      marginTop: scaleHeight(4),
    },
  });

  return (
    <>
      <Text style={s.title}>
        {projectName || 'Front Ensemble Block - Day 4'}
      </Text>
      <Text style={s.meta}>
        Traditional grip analysis - {scrubSeconds.toFixed(2)}s - frame{' '}
        {Math.min(totalVideoFrames, Math.round(scrubSeconds * videoFrameRate))}{' '}
        / {totalVideoFrames} - sample {Math.max(1, selectedIndex + 1)}
      </Text>

      <Pressable style={s.videoShell} onPress={showAverageValues}>
        {videoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={s.video}
            controls
            resizeMode="cover"
            paused={videoPaused}
            onLoad={(data: { duration: number }) => {
              setVideoDuration(data.duration);
            }}
            onProgress={(data: { currentTime: number }) => {
              handleVideoProgress(data.currentTime);
            }}
            onPlaybackStateChanged={(data: {
              isPlaying: boolean;
              isSeeking: boolean;
            }) => {
              isVideoPlayingRef.current = data.isPlaying;
              if (!isGraphDraggingRef.current) {
                setVideoPaused(!data.isPlaying);
              }
            }}
          />
        ) : (
          <>
            <Icon
              name="play-circle"
              color={dashboard.text}
              size={proportionalSize(42)}
            />
            <Text style={s.videoFallback}>
              Video preview will appear after storage URL loads
            </Text>
          </>
        )}
      </Pressable>

      <MovementTimelineChart
        data={chartData}
        currentTime={scrubSeconds}
        duration={videoDuration || chartData[chartData.length - 1]?.time || 1}
        onScrub={handleGraphScrub}
        onScrubStart={startGraphScrub}
        onScrubEnd={endGraphScrub}
      />
      <Text style={s.chartMode}>
        {showFrameValues
          ? 'Showing selected-frame contribution'
          : 'Showing average contribution'}
      </Text>

      <Pressable style={s.row} onPress={showAverageValues}>
        <MuscleTile
          label="Bicep"
          value={displayedUsage.bicep}
          color={dashboard.blue}
        />
        <MuscleTile
          label="Forearm"
          value={displayedUsage.forearm}
          color={dashboard.green}
        />
        <MuscleTile
          label="Wrist Break"
          value={displayedUsage.wristBreak}
          color={dashboard.gold}
        />
      </Pressable>

      <Pressable style={s.approachPanel} onPress={showAverageValues}>
        <View style={s.approachMain}>
          <Text style={s.eyebrow}>APPROACH</Text>
          <Text style={s.approachTitle}>{approach.category}</Text>
        </View>
        <View style={s.approachSide}>
          <Text style={s.eyebrow}>CONFIDENCE</Text>
          <Text style={s.confidence}>
            {confidenceLevel} {Math.round(approach.confidence)}%
          </Text>
        </View>
      </Pressable>

      <Pressable style={s.summaryPanel} onPress={showAverageValues}>
        <Text style={s.eyebrow}>COACHING SUMMARY</Text>
        <Text style={s.body}>{approach.summary}</Text>
      </Pressable>

      <Pressable style={s.angleRow} onPress={showAverageValues}>
        {[
          ['Left', result.angles?.left],
          ['Right', result.angles?.right],
        ].map(([label, angles]) => (
          <View style={s.angleCard} key={label as string}>
            <Text style={s.angleTitle}>{label as string} hand</Text>
            <Text style={s.angleText}>
              Bicep {Math.round((angles as any)?.bicep ?? 0)} deg
            </Text>
            <Text style={s.angleText}>
              Forearm {Math.round((angles as any)?.forearm ?? 0)} deg
            </Text>
            <Text style={s.angleText}>
              Wrist break {Math.round((angles as any)?.wristBreak ?? 0)} deg
            </Text>
          </View>
        ))}
      </Pressable>
    </>
  );
}

function ResultsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Results'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const live = useLiveAnalysisResult(route.params.sessionId);
  const query = useAnalysisResultQuery(route.params.sessionId);
  const sessionQuery = useSessionQuery(route.params.sessionId);
  const result = live.result ?? query.data;
  const overlayVideoUrl = useVideoUrl(result?.artifactPaths?.overlayVideoPath);
  const rawVideoUrl = useVideoUrl(sessionQuery.data?.rawVideoPath);
  const previewVideoUrl = overlayVideoUrl ?? rawVideoUrl;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: dashboard.bg },
        content: {
          padding: proportionalSize(20),
          paddingTop: scaleHeight(54),
          paddingBottom: scaleHeight(90),
        },
        backRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: scaleHeight(14),
        },
        backButton: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: scaleHeight(6),
          paddingRight: proportionalSize(14),
          paddingLeft: proportionalSize(2),
        },
        backLabel: {
          color: dashboard.blue,
          fontSize: scaleFont(16),
          fontWeight: '700',
          marginLeft: proportionalSize(4),
        },
        empty: {
          color: dashboard.muted,
          fontSize: scaleFont(15),
          marginTop: scaleHeight(20),
        },
      }),
    [proportionalSize, scaleFont, scaleHeight],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable
        style={styles.backButton}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Main');
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Icon
          name="chevron-left"
          size={proportionalSize(26)}
          color={dashboard.blue}
        />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      {!result && query.isLoading ? (
        <ActivityIndicator color={dashboard.blue} />
      ) : result ? (
        <ResultsContent
          result={result}
          videoUrl={previewVideoUrl}
          projectName={sessionQuery.data?.projectName ?? ''}
        />
      ) : (
        <Text style={styles.empty}>
          No result has been written for this session yet.
        </Text>
      )}
    </ScrollView>
  );
}

export default ResultsScreen;
