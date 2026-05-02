import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Button from '../../components/common/Button';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import {
  useLiveAnalysisJob,
  useSessionQuery,
} from '../../services/store/analysisQueries';

function SessionStatusScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SessionStatus'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const { data: session } = useSessionQuery(route.params.sessionId);
  const { job } = useLiveAnalysisJob(route.params.jobId ?? session?.latestJobId);
  const status = job?.status ?? session?.status ?? 'queued';

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: proportionalSize(24),
      justifyContent: 'center',
    },
    panel: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(20),
      borderColor: colors.borderLight,
      borderWidth: proportionalSize(1),
    },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(26),
      fontWeight: '800',
      marginBottom: scaleHeight(10),
      textAlign: 'center',
    },
    body: {
      color: colors.textSecondary,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(22),
      textAlign: 'center',
      marginBottom: scaleHeight(18),
    },
    status: {
      color: colors.primary,
      fontSize: scaleFont(16),
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: scaleHeight(18),
    },
    error: { color: colors.error },
    button: { marginTop: scaleHeight(8) },
  });

  const complete = status === 'completed';
  const failed = status === 'failed';

  return (
    <View style={s.container}>
      <View style={s.panel}>
        {!complete && !failed && <ActivityIndicator color={colors.primary} />}
        <Text style={s.title}>
          {complete ? 'Analysis ready' : failed ? 'Analysis failed' : 'Processing clip'}
        </Text>
        <Text style={s.body}>
          {complete
            ? 'Your motion breakdown is ready to review.'
            : failed
              ? job?.errorMessage || session?.errorMessage || 'The backend could not process this clip.'
              : 'The backend is analyzing timing, symmetry, stroke height, motion paths, and posture drift.'}
        </Text>
        <Text style={[s.status, failed ? s.error : null]}>{status}</Text>
        {complete && (
          <Button
            label="View Results"
            onPress={() =>
              navigation.replace('Results', { sessionId: route.params.sessionId })
            }
            style={s.button}
          />
        )}
        <Button
          label="Back to Home"
          variant="ghost"
          onPress={() => navigation.navigate('Main')}
          style={s.button}
        />
      </View>
    </View>
  );
}

export default SessionStatusScreen;
