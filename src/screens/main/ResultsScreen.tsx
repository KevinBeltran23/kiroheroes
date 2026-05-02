import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import {
  useAnalysisResultQuery,
  useLiveAnalysisResult,
} from '../../services/store/analysisQueries';
import { AnalysisResult, HandResult } from '../../types/analysis';

// ---------------------------------------------------------------------------
// Editable title
// ---------------------------------------------------------------------------
function EditableTitle({ initial }: { initial: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const colors = useColors();
  const { scaleFont, scaleHeight, proportionalSize } = useResponsiveStyles();

  const s = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: proportionalSize(8) },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(22),
      fontWeight: '800',
      flexShrink: 1,
    },
    input: {
      color: colors.textPrimary,
      fontSize: scaleFont(22),
      fontWeight: '800',
      flexShrink: 1,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      paddingBottom: scaleHeight(2),
    },
  });

  return (
    <View style={s.row}>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={setValue}
          onBlur={() => setEditing(false)}
          autoFocus
          style={s.input}
        />
      ) : (
        <>
          <Text style={s.title} numberOfLines={1}>{value}</Text>
          <TouchableOpacity onPress={() => setEditing(true)} accessibilityLabel="Edit title">
            <Icon name="pencil" size={proportionalSize(18)} color={colors.textSecondary} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Video player placeholder
// ---------------------------------------------------------------------------
function VideoPlayer({ thumbnailPath }: { thumbnailPath?: string | null }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const s = StyleSheet.create({
    container: {
      backgroundColor: colors.gray900,
      borderRadius: proportionalSize(10),
      height: scaleHeight(200),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: scaleHeight(20),
      overflow: 'hidden',
    },
    placeholder: {
      color: colors.textTertiary,
      fontSize: scaleFont(13),
      marginTop: scaleHeight(8),
    },
  });

  return (
    <View style={s.container}>
      <Icon name="play-circle-outline" size={proportionalSize(48)} color={colors.textTertiary} />
      <Text style={s.placeholder}>Video preview</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Contribution line chart (bar-based approximation)
// ---------------------------------------------------------------------------
const CHART_COLORS = {
  finger: '#4299E1',  // blue
  wrist: '#48BB78',   // green
  arm: '#F6AD55',     // amber
};

function ContributionChart({ result }: { result: AnalysisResult }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  // Use per-frame motion series if available, otherwise fall back to flat lines
  const rightMotion = result.chartSeries.rightHandMotion;
  const leftMotion = result.chartSeries.leftHandMotion;
  const n = Math.max(rightMotion.length, leftMotion.length, 1);

  // Build per-frame finger/wrist/arm estimates
  // If we have rightHand/leftHand pcts, distribute the wrist motion series accordingly
  const fingerPct = ((result.rightHand?.fingerPct ?? 33) + (result.leftHand?.fingerPct ?? 33)) / 2;
  const wristPct = ((result.rightHand?.wristPct ?? 33) + (result.leftHand?.wristPct ?? 33)) / 2;
  const armPct = ((result.rightHand?.armPct ?? 34) + (result.leftHand?.armPct ?? 34)) / 2;

  const barCount = Math.min(n, 24);
  const barWidth = `${Math.floor(100 / barCount) - 1}%` as any;

  const s = StyleSheet.create({
    section: { marginBottom: scaleHeight(20) },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: scaleHeight(10),
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
      fontWeight: '700',
    },
    legend: { flexDirection: 'row', gap: proportionalSize(12) },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: proportionalSize(4) },
    legendDot: { width: proportionalSize(8), height: proportionalSize(8), borderRadius: 4 },
    legendLabel: { color: colors.textSecondary, fontSize: scaleFont(12) },
    chartArea: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(12),
      borderColor: colors.borderLight,
      borderWidth: 1,
    },
    bars: {
      height: scaleHeight(100),
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: proportionalSize(2),
    },
    barGroup: { flex: 1, flexDirection: 'column', gap: proportionalSize(1) },
    bar: { borderRadius: proportionalSize(2) },
    yLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: scaleHeight(4),
    },
    yLabel: { color: colors.textTertiary, fontSize: scaleFont(10) },
  });

  return (
    <View style={s.section}>
      <View style={s.header}>
        <Text style={s.sectionTitle}>Contribution Over Time</Text>
        <View style={s.legend}>
          {[
            { label: 'Finger', color: CHART_COLORS.finger },
            { label: 'Wrist', color: CHART_COLORS.wrist },
            { label: 'Arm', color: CHART_COLORS.arm },
          ].map(item => (
            <View key={item.label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: item.color }]} />
              <Text style={s.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={s.chartArea}>
        <View style={s.bars}>
          {Array.from({ length: barCount }).map((_, i) => {
            const motion = (rightMotion[i] ?? 50) / 100;
            const fH = `${Math.max(4, fingerPct * motion)}%` as any;
            const wH = `${Math.max(4, wristPct * motion)}%` as any;
            const aH = `${Math.max(4, armPct * motion)}%` as any;
            return (
              <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                <View style={[s.bar, { flex: 1, height: fH, backgroundColor: CHART_COLORS.finger }]} />
                <View style={[s.bar, { flex: 1, height: wH, backgroundColor: CHART_COLORS.wrist }]} />
                <View style={[s.bar, { flex: 1, height: aH, backgroundColor: CHART_COLORS.arm }]} />
              </View>
            );
          })}
        </View>
        <View style={s.yLabels}>
          <Text style={s.yLabel}>0s</Text>
          <Text style={s.yLabel}>6s</Text>
          <Text style={s.yLabel}>12s</Text>
          <Text style={s.yLabel}>18s</Text>
          <Text style={s.yLabel}>24s</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Contribution percentage cards
// ---------------------------------------------------------------------------
function ContributionCards({ right, left }: { right?: HandResult; left?: HandResult }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const fingerPct = Math.round(((right?.fingerPct ?? 33) + (left?.fingerPct ?? 33)) / 2);
  const wristPct = Math.round(((right?.wristPct ?? 33) + (left?.wristPct ?? 33)) / 2);
  const armPct = Math.round(((right?.armPct ?? 34) + (left?.armPct ?? 34)) / 2);

  const cards = [
    { label: 'FINGER', value: fingerPct, color: CHART_COLORS.finger },
    { label: 'WRIST', value: wristPct, color: CHART_COLORS.wrist },
    { label: 'ARM', value: armPct, color: CHART_COLORS.arm },
  ];

  const s = StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: proportionalSize(8),
      marginBottom: scaleHeight(16),
    },
    card: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(12),
      borderColor: colors.borderLight,
      borderWidth: 1,
      alignItems: 'flex-start',
    },
    cardLabel: {
      fontSize: scaleFont(11),
      fontWeight: '700',
      marginBottom: scaleHeight(4),
    },
    cardValue: {
      fontSize: scaleFont(26),
      fontWeight: '800',
    },
  });

  return (
    <View style={s.row}>
      {cards.map(card => (
        <View key={card.label} style={s.card}>
          <Text style={[s.cardLabel, { color: card.color }]}>{card.label}</Text>
          <Text style={[s.cardValue, { color: card.color }]}>{card.value}%</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Approach card
// ---------------------------------------------------------------------------
const APPROACH_LABELS: Record<string, string> = {
  'arm-heavy': 'Arm-Heavy',
  'fulcrum-lift': 'Fulcrum Lift',
  'lead-by-the-bead': 'Lead by the Bead',
  'wrist-break': 'Wrist Break',
};

function ApproachCard({ right, left }: { right?: HandResult; left?: HandResult }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const label = right?.label ?? left?.label;
  if (!label) return null;

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(14),
      borderColor: colors.borderLight,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scaleHeight(12),
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: proportionalSize(10) },
    iconCircle: {
      width: proportionalSize(40),
      height: proportionalSize(40),
      borderRadius: proportionalSize(20),
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    approachLabel: {
      color: colors.textTertiary,
      fontSize: scaleFont(11),
      fontWeight: '700',
      marginBottom: scaleHeight(2),
    },
    approachValue: {
      color: colors.accent,
      fontSize: scaleFont(20),
      fontWeight: '800',
    },
  });

  return (
    <View style={s.card}>
      <View style={s.left}>
        <View style={s.iconCircle}>
          <Icon name="arm-flex" size={proportionalSize(22)} color={colors.accent} />
        </View>
        <View>
          <Text style={s.approachLabel}>APPROACH</Text>
          <Text style={s.approachValue}>{APPROACH_LABELS[label] ?? label}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Coaching summary
// ---------------------------------------------------------------------------
function CoachingSummary({ result }: { result: AnalysisResult }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const summary = result.overallSummary
    ?? result.feedbackItems[0]?.suggestion
    ?? result.flags[0]?.explanation
    ?? 'No coaching summary available.';

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(14),
      borderColor: colors.borderLight,
      borderWidth: 1,
      marginBottom: scaleHeight(24),
    },
    label: {
      color: colors.textTertiary,
      fontSize: scaleFont(11),
      fontWeight: '700',
      marginBottom: scaleHeight(6),
    },
    body: {
      color: colors.textPrimary,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(21),
    },
  });

  return (
    <View style={s.card}>
      <Text style={s.label}>COACHING SUMMARY</Text>
      <Text style={s.body}>{summary}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main results content
// ---------------------------------------------------------------------------
function ResultsContent({ result }: { result: AnalysisResult }) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const s = StyleSheet.create({
    badge: {
      color: colors.warning,
      fontSize: scaleFont(12),
      fontWeight: '700',
      marginBottom: scaleHeight(8),
    },
    meta: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
      marginTop: scaleHeight(4),
      marginBottom: scaleHeight(16),
    },
  });

  return (
    <>
      {result.isMock && <Text style={s.badge}>Mock result</Text>}
      <Text style={s.meta}>
        {new Date(result.createdAt?.seconds ? result.createdAt.seconds * 1000 : Date.now()).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
      <VideoPlayer thumbnailPath={result.artifactPaths?.thumbnailPath} />
      <ContributionChart result={result} />
      <ContributionCards right={result.rightHand} left={result.leftHand} />
      <ApproachCard right={result.rightHand} left={result.leftHand} />
      <CoachingSummary result={result} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
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
    empty: {
      color: colors.textSecondary,
      fontSize: scaleFont(15),
      marginTop: scaleHeight(20),
    },
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <EditableTitle initial="Analysis Results" />
      {!result && query.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: scaleHeight(40) }} />
      ) : result ? (
        <ResultsContent result={result} />
      ) : (
        <Text style={s.empty}>No result available for this session yet.</Text>
      )}
    </ScrollView>
  );
}

export default ResultsScreen;
