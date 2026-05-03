import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useSessionsQuery } from '../../services/store/analysisQueries';
import { AnalysisSession, SessionStatus } from '../../types/analysis';
import Button from '../../components/common/Button';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const exerciseLabels: Record<AnalysisSession['exerciseType'], string> = {
  single_strokes: 'Single strokes',
  double_strokes: 'Double strokes',
  paradiddles: 'Paradiddles',
};

function formatStatus(status: SessionStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isActiveJob(status: SessionStatus) {
  return (
    status === 'uploading' ||
    status === 'queued' ||
    status === 'processing'
  );
}

function statusIcon(status: SessionStatus): {
  name: string;
  color: string;
} {
  switch (status) {
    case 'completed':
      return { name: 'check-circle-outline', color: '#38C55D' };
    case 'failed':
      return { name: 'alert-circle-outline', color: '#FC6262' };
    case 'uploading':
    case 'queued':
    case 'processing':
      return { name: 'progress-clock', color: '#3B7BF6' };
    default:
      return { name: 'file-outline', color: '#7B8BA3' };
  }
}

function HomeScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const navigation = useNavigation<HomeNavigation>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const { data: sessions = [], isLoading } = useSessionsQuery(user?.uid);

  // Split sessions into active (in-progress) and recent (completed/failed/draft)
  const activeSessions = sessions.filter(s => isActiveJob(s.status));
  const recentSessions = sessions
    .filter(s => !isActiveJob(s.status))
    .slice(0, 5);

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: proportionalSize(20),
      paddingTop: scaleHeight(58),
    },
    eyebrow: {
      color: colors.primary,
      fontSize: scaleFont(12),
      fontWeight: '900',
      marginBottom: scaleHeight(7),
      letterSpacing: 0,
    },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(30),
      fontWeight: '900',
      marginBottom: scaleHeight(8),
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
      marginBottom: scaleHeight(20),
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
      fontWeight: '900',
      marginTop: scaleHeight(12),
      marginBottom: scaleHeight(10),
    },

    /* active job card — highlighted */
    activeCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: proportionalSize(10),
      padding: proportionalSize(14),
      marginBottom: scaleHeight(10),
      borderWidth: 1,
      borderColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: proportionalSize(12),
    },
    activeIndicator: {
      width: proportionalSize(40),
      height: proportionalSize(40),
      borderRadius: proportionalSize(20),
      backgroundColor: 'rgba(59,123,246,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeTextWrap: { flex: 1 },
    activeTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(15),
      fontWeight: '800',
      marginBottom: scaleHeight(3),
    },
    activeStatus: {
      color: colors.primary,
      fontSize: scaleFont(12),
      fontWeight: '700',
    },

    /* regular card */
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(13),
      marginBottom: scaleHeight(9),
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: proportionalSize(10),
    },
    cardText: { flex: 1 },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(15),
      fontWeight: '800',
      marginBottom: scaleHeight(4),
    },
    cardMeta: {
      color: colors.textSecondary,
      fontSize: scaleFont(12),
    },
    empty: {
      color: colors.textSecondary,
      fontSize: scaleFont(14),
      lineHeight: scaleFont(20),
    },
  });

  const openSession = (session: AnalysisSession) => {
    if (session.status === 'completed') {
      navigation.navigate('Results', { sessionId: session.id });
    } else {
      navigation.navigate('SessionStatus', {
        sessionId: session.id,
        jobId: session.latestJobId ?? undefined,
      });
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.eyebrow}>STICKSPLIT</Text>
      <Text style={s.title}>Technique dashboard</Text>
      <Text style={s.subtitle}>
        Review marching snare reps through muscle contribution, wrist break,
        stick-path trends, and hand-specific traditional grip rules.
      </Text>

      <Button
        label="New Project"
        onPress={() => navigation.navigate('NewSessionTab')}
      />

      {/* Active jobs section */}
      {activeSessions.length > 0 && (
        <>
          <Text style={s.sectionTitle}>In progress</Text>
          {activeSessions.map(session => {
            const si = statusIcon(session.status);
            return (
              <TouchableOpacity
                key={session.id}
                style={s.activeCard}
                onPress={() => openSession(session)}
              >
                <View style={s.activeIndicator}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
                <View style={s.activeTextWrap}>
                  <Text style={s.activeTitle}>
                    {session.projectName ||
                      exerciseLabels[session.exerciseType]}
                  </Text>
                  <Text style={s.activeStatus}>
                    {formatStatus(session.status)}
                    {session.status === 'processing'
                      ? ' — analyzing motion'
                      : session.status === 'uploading'
                        ? ' — sending video'
                        : ' — waiting in queue'}
                  </Text>
                </View>
                <Icon
                  name="chevron-right"
                  size={proportionalSize(20)}
                  color={colors.primary}
                />
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* History section */}
      <Text style={s.sectionTitle}>History</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={recentSessions}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={s.empty}>
              No sessions yet. Create a project, set the drum height, record the
              rep, and process the clip.
            </Text>
          }
          renderItem={({ item }) => {
            const si = statusIcon(item.status);
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => openSession(item)}
              >
                <Icon
                  name={si.name as React.ComponentProps<typeof Icon>['name']}
                  size={proportionalSize(21)}
                  color={si.color}
                />
                <View style={s.cardText}>
                  <Text style={s.cardTitle}>
                    {item.projectName || exerciseLabels[item.exerciseType]}
                  </Text>
                  <Text style={s.cardMeta}>
                    {formatStatus(item.status)}
                    {item.drumHeightInches
                      ? ` — ${item.drumHeightInches}" drum`
                      : ''}
                  </Text>
                </View>
                <Icon
                  name="chevron-right"
                  size={proportionalSize(20)}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

export default HomeScreen;
