import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import { useSessionsQuery } from '../../services/store/analysisQueries';
import { AnalysisSession } from '../../types';

const labels: Record<AnalysisSession['exerciseType'], string> = {
  single_strokes: 'Single strokes',
  double_strokes: 'Double strokes',
  paradiddles: 'Paradiddles',
};

function HistoryScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const { data: sessions = [], isLoading } = useSessionsQuery(user?.uid);

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: proportionalSize(20),
      paddingTop: scaleHeight(56),
    },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(28),
      fontWeight: '800',
      marginBottom: scaleHeight(16),
    },
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(14),
      marginBottom: scaleHeight(10),
      borderColor: colors.borderLight,
      borderWidth: proportionalSize(1),
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
      fontWeight: '700',
    },
    meta: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
      marginTop: scaleHeight(5),
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
      return;
    }
    navigation.navigate('SessionStatus', {
      sessionId: session.id,
      jobId: session.latestJobId ?? undefined,
    });
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Session history</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={s.empty}>Completed and in-progress analyses appear here.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => openSession(item)}>
              <Text style={s.cardTitle}>{labels[item.exerciseType]}</Text>
              <Text style={s.meta}>
                {item.status}
                {item.tempoTarget ? ` · ${item.tempoTarget} BPM` : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

export default HistoryScreen;
