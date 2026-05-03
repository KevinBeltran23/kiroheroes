import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { RouteProp, useRoute } from '@react-navigation/native';
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
  bg: '#070A0E',
  panel: '#10151B',
  panel2: '#151B22',
  border: '#27313B',
  text: '#F4F7FA',
  muted: '#9AA5B1',
  blue: '#2E8BFF',
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
  const isGraphDraggingRef = useRef(false);
  const isVideoPlayingRef = useRef(false);
  const wasPlayingBeforeGraphDragRef = useRef(false);
  const videoRef = useRef<any>(null);
  const muscleUsage = result.muscleUsage ?? {
    finger: metricFromResult(result, 'finger_usage', 28),
    wrist: metricFromResult(result, 'wrist_usage', 52),
    arm: metricFromResult(result, 'arm_usage', 20),
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
    result.chartSeries.fingerUsage?.length ?? 0,
    result.chartSeries.wristUsage?.length ?? 0,
    result.chartSeries.armUsage?.length ?? 0,
    1,
  );
  const selectedIndex = Math.round(scrubProgress * Math.max(frameCount - 1, 1));
  const scrubSeconds = scrubProgress * videoDuration;
  const totalVideoFrames = Math.max(
    1,
    Math.round(videoDuration * videoFrameRate),
  );
  const chartData = useMemo<MovementTimelinePoint[]>(() => {
    const finger = result.chartSeries.fingerUsage ?? [
      28, 35, 31, 33, 30, 37, 34, 36,
    ];
    const wrist = result.chartSeries.wristUsage ?? [
      60, 66, 70, 68, 72, 69, 71, 68,
    ];
    const arm = result.chartSeries.armUsage ?? [18, 13, 16, 12, 15, 17, 14, 18];
    const count = Math.max(finger.length, wrist.length, arm.length, 1);
    const timelineDuration = videoDuration || count - 1 || 1;

    return Array.from({ length: count }).map((_, index) => ({
      time:
        count === 1 ? 0 : timelineDuration * (index / Math.max(count - 1, 1)),
      finger: finger[index] ?? finger[finger.length - 1] ?? 0,
      wrist: wrist[index] ?? wrist[wrist.length - 1] ?? 0,
      arm: arm[index] ?? arm[arm.length - 1] ?? 0,
    }));
  }, [
    result.chartSeries.armUsage,
    result.chartSeries.fingerUsage,
    result.chartSeries.wristUsage,
    videoDuration,
  ]);

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

  const startGraphScrub = () => {
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

      <View style={s.videoShell}>
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
      </View>

      <MovementTimelineChart
        data={chartData}
        currentTime={scrubSeconds}
        duration={videoDuration || chartData[chartData.length - 1]?.time || 1}
        onScrub={handleGraphScrub}
        onScrubStart={startGraphScrub}
        onScrubEnd={endGraphScrub}
      />

      <View style={s.row}>
        <MuscleTile
          label="Finger"
          value={muscleUsage.finger}
          color={dashboard.blue}
        />
        <MuscleTile
          label="Wrist"
          value={muscleUsage.wrist}
          color={dashboard.green}
        />
        <MuscleTile
          label="Arm"
          value={muscleUsage.arm}
          color={dashboard.gold}
        />
      </View>

      <View style={s.approachPanel}>
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
      </View>

      <View style={s.summaryPanel}>
        <Text style={s.eyebrow}>COACHING SUMMARY</Text>
        <Text style={s.body}>{approach.summary}</Text>
      </View>

      <View style={s.angleRow}>
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
      </View>
    </>
  );
}

function ResultsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Results'>>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const live = useLiveAnalysisResult(route.params.sessionId);
  const query = useAnalysisResultQuery(route.params.sessionId);
  const sessionQuery = useSessionQuery(route.params.sessionId);
  const result = live.result ?? query.data;
  const rawVideoUrl = useVideoUrl(sessionQuery.data?.rawVideoPath);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: dashboard.bg },
        content: {
          padding: proportionalSize(20),
          paddingTop: scaleHeight(54),
          paddingBottom: scaleHeight(90),
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
      {!result && query.isLoading ? (
        <ActivityIndicator color={dashboard.gold} />
      ) : result ? (
        <ResultsContent
          result={result}
          videoUrl={rawVideoUrl}
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
