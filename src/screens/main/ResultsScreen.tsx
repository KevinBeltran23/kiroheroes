import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import {
  useAnalysisResultQuery,
  useLiveAnalysisResult,
} from '../../services/store/analysisQueries';
import { AnalysisResult } from '../../types';

function ScoreCard({ label, value }: { label: string; value: number }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const s = StyleSheet.create({
    card: {
      flex: 1,
      minWidth: '47%',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(14),
      marginBottom: scaleHeight(10),
      borderColor: colors.borderLight,
      borderWidth: proportionalSize(1),
    },
    value: {
      color: colors.textPrimary,
      fontSize: scaleFont(28),
      fontWeight: '800',
    },
    label: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
      marginTop: scaleHeight(3),
    },
  });

  return (
    <View style={s.card}>
      <Text style={s.value}>{Math.round(value)}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

function MiniChart({ values }: { values: number[] }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize } = useResponsiveStyles();
  const max = Math.max(...values, 1);
  const s = StyleSheet.create({
    chart: {
      height: scaleHeight(80),
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: proportionalSize(6),
      marginVertical: scaleHeight(8),
    },
    bar: {
      flex: 1,
      minHeight: scaleHeight(4),
      borderRadius: proportionalSize(4),
      backgroundColor: colors.primary,
    },
  });
  return (
    <View style={s.chart}>
      {values.map((value, index) => (
        <View
          key={`${value}-${index}`}
          style={[s.bar, { height: `${Math.max(8, (value / max) * 100)}%` }]}
        />
      ))}
    </View>
  );
}

function ResultsContent({ result }: { result: AnalysisResult }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const scores = result.summaryScores;

  const s = StyleSheet.create({
    scoreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: proportionalSize(10),
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(18),
      fontWeight: '800',
      marginTop: scaleHeight(22),
      marginBottom: scaleHeight(10),
    },
    panel: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(14),
      marginBottom: scaleHeight(10),
      borderColor: colors.borderLight,
      borderWidth: proportionalSize(1),
    },
    itemTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(15),
      fontWeight: '700',
      marginBottom: scaleHeight(5),
    },
    itemBody: {
      color: colors.textSecondary,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
    },
    badge: {
      color: result.isMock ? colors.warning : colors.textSecondary,
      fontSize: scaleFont(13),
      fontWeight: '700',
      marginBottom: scaleHeight(8),
    },
  });

  return (
    <>
      {result.isMock && <Text style={s.badge}>Mock analysis result</Text>}
      <View style={s.scoreGrid}>
        <ScoreCard label="Overall" value={scores.overall} />
        <ScoreCard label="Timing" value={scores.timing} />
        <ScoreCard label="Symmetry" value={scores.symmetry} />
        <ScoreCard label="Stroke consistency" value={scores.strokeConsistency} />
        <ScoreCard label="Posture stability" value={scores.postureStability} />
      </View>

      <Text style={s.sectionTitle}>Top findings</Text>
      {result.flags.map(flag => (
        <View style={s.panel} key={flag.id}>
          <Text style={s.itemTitle}>{flag.title}</Text>
          <Text style={s.itemBody}>
            {flag.explanation} ({flag.startTime.toFixed(1)}s
            {flag.endTime ? `-${flag.endTime.toFixed(1)}s` : ''})
          </Text>
        </View>
      ))}

      <Text style={s.sectionTitle}>Motion chart</Text>
      <View style={s.panel}>
        <Text style={s.itemTitle}>Right hand motion over time</Text>
        <MiniChart values={result.chartSeries.rightHandMotion} />
      </View>

      <Text style={s.sectionTitle}>Suggestions</Text>
      {result.feedbackItems.map(item => (
        <View style={s.panel} key={item.id}>
          <Text style={s.itemTitle}>{item.title}</Text>
          <Text style={s.itemBody}>{item.suggestion}</Text>
        </View>
      ))}
    </>
  );
}

function ResultsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Results'>>();
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const live = useLiveAnalysisResult(route.params.sessionId);
  const query = useAnalysisResultQuery(route.params.sessionId);
  const result = live.result ?? query.data;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: proportionalSize(20),
      paddingTop: scaleHeight(56),
      paddingBottom: scaleHeight(80),
    },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(28),
      fontWeight: '800',
      marginBottom: scaleHeight(8),
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
      marginBottom: scaleHeight(18),
    },
    empty: {
      color: colors.textSecondary,
      fontSize: scaleFont(15),
      marginTop: scaleHeight(20),
    },
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Analysis results</Text>
      <Text style={s.subtitle}>
        Motion consistency observations based on the submitted clip.
      </Text>
      {!result && query.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : result ? (
        <ResultsContent result={result} />
      ) : (
        <Text style={s.empty}>No result has been written for this session yet.</Text>
      )}
    </ScrollView>
  );
}

export default ResultsScreen;
