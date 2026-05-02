import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useSessionsQuery } from '../../services/store/analysisQueries';
import { AnalysisSession } from '../../types/analysis';
import Button from '../../components/common/Button';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ui = {
  bg: '#070A0E',
  panel: '#10151B',
  border: '#27313B',
  text: '#F4F7FA',
  muted: '#9AA5B1',
  gold: '#F2B705',
  blue: '#2E8BFF',
};

const exerciseLabels: Record<AnalysisSession['exerciseType'], string> = {
  single_strokes: 'Single strokes',
  double_strokes: 'Double strokes',
  paradiddles: 'Paradiddles',
};

function formatStatus(status: AnalysisSession['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatCreatedAt(value: any) {
  const date = value?.toDate?.() ?? value;
  return date instanceof Date ? date.toLocaleDateString() : 'Recent';
}

function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<HomeNavigation>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const { data: sessions = [], isLoading } = useSessionsQuery(user?.uid);
  const recent = sessions[0];

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ui.bg,
      padding: proportionalSize(20),
      paddingTop: scaleHeight(58),
    },
    eyebrow: {
      color: ui.gold,
      fontSize: scaleFont(12),
      fontWeight: '900',
      marginBottom: scaleHeight(7),
      letterSpacing: 0,
    },
    title: {
      color: ui.text,
      fontSize: scaleFont(30),
      fontWeight: '900',
      marginBottom: scaleHeight(8),
    },
    subtitle: {
      color: ui.muted,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
      marginBottom: scaleHeight(20),
    },
    hero: {
      backgroundColor: ui.panel,
      borderRadius: proportionalSize(8),
      borderWidth: 1,
      borderColor: ui.border,
      padding: proportionalSize(14),
      marginBottom: scaleHeight(16),
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scaleHeight(16),
    },
    heroTitle: { color: ui.text, fontSize: scaleFont(17), fontWeight: '900', flex: 1 },
    heroMeta: { color: ui.muted, fontSize: scaleFont(12), marginTop: scaleHeight(4) },
    playBox: {
      height: scaleHeight(118),
      backgroundColor: '#0B1016',
      borderRadius: proportionalSize(8),
      borderColor: ui.border,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionTitle: {
      color: ui.text,
      fontSize: scaleFont(16),
      fontWeight: '900',
      marginTop: scaleHeight(12),
      marginBottom: scaleHeight(10),
    },
    card: {
      backgroundColor: ui.panel,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(13),
      marginBottom: scaleHeight(9),
      borderWidth: 1,
      borderColor: ui.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: proportionalSize(10),
    },
    cardText: { flex: 1 },
    cardTitle: {
      color: ui.text,
      fontSize: scaleFont(15),
      fontWeight: '800',
      marginBottom: scaleHeight(4),
    },
    cardMeta: {
      color: ui.muted,
      fontSize: scaleFont(12),
    },
    empty: {
      color: ui.muted,
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

      <Button label="New Project" onPress={() => navigation.navigate('NewSessionTab')} />

      {recent && (
        <TouchableOpacity style={s.hero} onPress={() => openSession(recent)}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroTitle}>{recent.projectName || exerciseLabels[recent.exerciseType]}</Text>
              <Text style={s.heroMeta}>
                {formatCreatedAt(recent.createdAt)} - {formatStatus(recent.status)}
              </Text>
            </View>
            <Icon name="chevron-right" size={proportionalSize(24)} color={ui.muted} />
          </View>
          <View style={s.playBox}>
            <Icon name="play-circle" size={proportionalSize(42)} color={ui.text} />
          </View>
        </TouchableOpacity>
      )}

      <Text style={s.sectionTitle}>History</Text>
      {isLoading ? (
        <ActivityIndicator color={ui.gold} />
      ) : (
        <FlatList
          data={sessions.slice(0, 5)}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={s.empty}>
              No sessions yet. Create a project, set the drum height, record the
              rep, and process the clip.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => openSession(item)}>
              <Icon name="chart-line" size={proportionalSize(21)} color={ui.blue} />
              <View style={s.cardText}>
                <Text style={s.cardTitle}>{item.projectName || exerciseLabels[item.exerciseType]}</Text>
                <Text style={s.cardMeta}>
                  {formatStatus(item.status)}
                  {item.drumHeightInches ? ` - ${item.drumHeightInches}" drum` : ''}
                </Text>
              </View>
              <Icon name="chevron-right" size={proportionalSize(20)} color={ui.muted} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

export default HomeScreen;
