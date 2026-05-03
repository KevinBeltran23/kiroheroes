import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import {
  useLiveAnalysisJob,
  useLiveSession,
} from '../../services/store/analysisQueries';
import { SessionStatus } from '../../types/analysis';

/* ── phase definitions ── */
const phases: Array<{
  key: SessionStatus;
  label: string;
  icon: string;
}> = [
  { key: 'uploading', label: 'Uploading video', icon: 'cloud-upload-outline' },
  { key: 'queued', label: 'Queued for analysis', icon: 'clock-outline' },
  { key: 'processing', label: 'Analyzing motion', icon: 'chart-timeline-variant' },
  { key: 'completed', label: 'Analysis complete', icon: 'check-circle-outline' },
];

function phaseIndex(status: SessionStatus): number {
  const idx = phases.findIndex(p => p.key === status);
  return idx >= 0 ? idx : 1; // default to queued
}

/* ── spinning ring component ── */
function SpinningRing({ color, size }: { color: string; size: number }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: 'transparent',
        borderTopColor: color,
        borderRightColor: color,
        transform: [{ rotate }],
      }}
    />
  );
}

function SessionStatusScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SessionStatus'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const { session } = useLiveSession(route.params.sessionId);
  const { job } = useLiveAnalysisJob(
    route.params.jobId ?? session?.latestJobId,
  );
  const status: SessionStatus = job?.status ?? session?.status ?? 'queued';
  const currentPhase = phaseIndex(status);
  const complete = status === 'completed';
  const failed = status === 'failed';

  const s = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: proportionalSize(28),
    },

    /* hero ring */
    heroWrap: {
      width: proportionalSize(120),
      height: proportionalSize(120),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scaleHeight(28),
    },
    heroIconWrap: {
      position: 'absolute',
    },

    /* text */
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(24),
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: scaleHeight(8),
    },
    body: {
      color: colors.textSecondary,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(21),
      textAlign: 'center',
      marginBottom: scaleHeight(28),
      paddingHorizontal: proportionalSize(8),
    },

    /* phase stepper */
    stepper: {
      width: '100%',
      marginBottom: scaleHeight(32),
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: scaleHeight(6),
    },
    stepDot: {
      width: proportionalSize(10),
      height: proportionalSize(10),
      borderRadius: proportionalSize(5),
      marginRight: proportionalSize(12),
    },
    stepDotActive: {
      backgroundColor: colors.primary,
    },
    stepDotDone: {
      backgroundColor: colors.success,
    },
    stepDotPending: {
      backgroundColor: colors.borderDark,
    },
    stepDotFailed: {
      backgroundColor: colors.error,
    },
    stepLabel: {
      fontSize: scaleFont(14),
      fontWeight: '600',
    },
    stepLabelActive: {
      color: colors.textPrimary,
    },
    stepLabelDone: {
      color: colors.success,
    },
    stepLabelPending: {
      color: colors.textTertiary,
    },
    stepLabelFailed: {
      color: colors.error,
    },
    stepConnector: {
      width: 2,
      height: scaleHeight(14),
      marginLeft: proportionalSize(4),
      marginBottom: scaleHeight(6),
      backgroundColor: colors.borderDark,
    },
    stepConnectorDone: {
      backgroundColor: colors.success,
    },

    /* error */
    errorText: {
      color: colors.error,
      fontSize: scaleFont(13),
      textAlign: 'center',
      marginBottom: scaleHeight(18),
      paddingHorizontal: proportionalSize(8),
    },

    /* buttons */
    buttonWrap: {
      width: '100%',
      gap: scaleHeight(10),
    },
  });

  const heroIcon = failed
    ? 'alert-circle-outline'
    : complete
      ? 'check-circle-outline'
      : 'flask-outline';
  const heroColor = failed
    ? colors.error
    : complete
      ? colors.success
      : colors.primary;

  return (
    <View style={s.root}>
      <View style={s.container}>
        {/* Hero animation */}
        <View style={s.heroWrap}>
          {!complete && !failed && (
            <SpinningRing
              color={colors.primary}
              size={proportionalSize(120)}
            />
          )}
          <View style={s.heroIconWrap}>
            <Icon
              name={heroIcon as React.ComponentProps<typeof Icon>['name']}
              size={proportionalSize(48)}
              color={heroColor}
            />
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>
          {complete
            ? 'Analysis ready'
            : failed
              ? 'Analysis failed'
              : 'Processing your rep'}
        </Text>
        <Text style={s.body}>
          {complete
            ? 'Your motion breakdown is ready to review.'
            : failed
              ? job?.errorMessage ||
                session?.errorMessage ||
                'The backend could not process this clip.'
              : 'Sit tight — the backend is analyzing timing, symmetry, stroke height, motion paths, and posture.'}
        </Text>

        {/* Phase stepper */}
        {!failed && (
          <View style={s.stepper}>
            {phases.map((phase, idx) => {
              const isDone = idx < currentPhase || complete;
              const isActive = idx === currentPhase && !complete;
              const dotStyle = isDone
                ? s.stepDotDone
                : isActive
                  ? s.stepDotActive
                  : s.stepDotPending;
              const labelStyle = isDone
                ? s.stepLabelDone
                : isActive
                  ? s.stepLabelActive
                  : s.stepLabelPending;
              const showConnector = idx < phases.length - 1;

              return (
                <React.Fragment key={phase.key}>
                  <View style={s.stepRow}>
                    <View style={[s.stepDot, dotStyle]} />
                    <Icon
                      name={
                        phase.icon as React.ComponentProps<typeof Icon>['name']
                      }
                      size={proportionalSize(16)}
                      color={
                        isDone
                          ? colors.success
                          : isActive
                            ? colors.primary
                            : colors.textTertiary
                      }
                      style={{ marginRight: proportionalSize(8) }}
                    />
                    <Text style={[s.stepLabel, labelStyle]}>
                      {phase.label}
                      {isActive && !complete ? '…' : ''}
                    </Text>
                    {isActive && !complete && (
                      <ActivityIndicator
                        color={colors.primary}
                        size="small"
                        style={{ marginLeft: proportionalSize(8) }}
                      />
                    )}
                    {isDone && (
                      <Icon
                        name="check"
                        size={proportionalSize(14)}
                        color={colors.success}
                        style={{ marginLeft: proportionalSize(6) }}
                      />
                    )}
                  </View>
                  {showConnector && (
                    <View
                      style={[
                        s.stepConnector,
                        isDone ? s.stepConnectorDone : null,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* Error detail */}
        {failed && (
          <Text style={s.errorText}>
            {job?.errorMessage ||
              session?.errorMessage ||
              'An unexpected error occurred during analysis.'}
          </Text>
        )}

        {/* Actions */}
        <View style={s.buttonWrap}>
          {complete && (
            <Button
              label="View Results"
              onPress={() =>
                navigation.replace('Results', {
                  sessionId: route.params.sessionId,
                })
              }
            />
          )}
          <Button
            label="Back to Home"
            variant="ghost"
            onPress={() => navigation.navigate('Main')}
          />
        </View>
      </View>
    </View>
  );
}

export default SessionStatusScreen;
