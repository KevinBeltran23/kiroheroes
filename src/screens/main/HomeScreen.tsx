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
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useSessionsQuery } from '../../services/store/analysisQueries';
import { AnalysisSession } from '../../types/analysis';
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

function formatStatus(status: AnalysisSession['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function HomeScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const navigation = useNavigation<HomeNavigation>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const { data: sessions = [], isLoading } = useSessionsQuery(user?.uid);

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: proportionalSize(20),
      paddingTop: scaleHeight(62),
    },
    eyebrow: {
      color: colors.primary,
      fontSize: scaleFont(14),
      fontWeight: '700',
      marginBottom: scaleHeight(8),
    },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(30),
      fontWeight: '800',
      marginBottom: scaleHeight(8),
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: scaleFont(16),
      lineHeight: scaleFont(22),
      marginBottom: scaleHeight(22),
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(18),
      fontWeight: '700',
      marginTop: scaleHeight(24),
      marginBottom: scaleHeight(12),
    },
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(14),
      marginBottom: scaleHeight(10),
      borderWidth: proportionalSize(1),
      borderColor: colors.borderLight,
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
      fontWeight: '700',
      marginBottom: scaleHeight(6),
    },
    cardMeta: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
    },
    empty: {
      color: colors.textSecondary,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
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
      <Text style={s.eyebrow}>POST-PROCESSING ANALYSIS</Text>
      <Text style={s.title}>Drumming technique review</Text>
      <Text style={s.subtitle}>
        Upload a short pad or snare clip and get motion consistency, timing,
        symmetry, and posture observations after processing.
      </Text>
      <Button
        label="Analyze a Clip"
        onPress={() => navigation.navigate('NewSessionTab')}
      />

      <Text style={s.sectionTitle}>Recent Sessions</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={sessions.slice(0, 5)}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={s.empty}>
              No sessions yet. Start with single strokes, double strokes, or a
              paradiddle clip.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => openSession(item)}>
              <Text style={s.cardTitle}>{exerciseLabels[item.exerciseType]}</Text>
              <Text style={s.cardMeta}>
                {formatStatus(item.status)}
                {item.tempoTarget ? ` · ${item.tempoTarget} BPM target` : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

export default HomeScreen;
