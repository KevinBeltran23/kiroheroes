import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MediaUploader from '../../components/media/MediaUploader';
import Button from '../../components/common/Button';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { useCreateAnalysisSession } from '../../hooks/useCreateAnalysisSession';
import { RootStackParamList } from '../../navigation/types';
import { ExerciseType } from '../../types/analysis';
import { getUserFacingMessage } from '../../services/errorHandler';

const exercises: Array<{ value: ExerciseType; label: string; description: string }> = [
  {
    value: 'single_strokes',
    label: 'Single strokes',
    description: 'Alternating right-left strokes with even spacing.',
  },
  {
    value: 'double_strokes',
    label: 'Double strokes',
    description: 'Two consecutive strokes per hand with rebound control.',
  },
  {
    value: 'paradiddles',
    label: 'Paradiddles',
    description: 'RLRR LRLL pattern with consistent accents and paths.',
  },
];

function NewSessionScreen() {
  const [exerciseType, setExerciseType] = useState<ExerciseType>('single_strokes');
  const [tempoTarget, setTempoTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const colors = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const createSession = useCreateAnalysisSession();

  const submit = async () => {
    if (!videoUri) {
      Alert.alert('Video required', 'Record or choose a short practice clip.');
      return;
    }

    const parsedTempo = tempoTarget.trim() ? Number(tempoTarget) : null;
    if (parsedTempo !== null && (!Number.isFinite(parsedTempo) || parsedTempo < 30)) {
      Alert.alert('Tempo target', 'Enter a valid BPM target or leave it blank.');
      return;
    }

    try {
      const result = await createSession.mutateAsync({
        exerciseType,
        tempoTarget: parsedTempo,
        notes,
        videoUri,
      });
      navigation.navigate('SessionStatus', result);
    } catch (error) {
      Alert.alert('Upload failed', getUserFacingMessage(error));
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: proportionalSize(20),
      paddingTop: scaleHeight(56),
      paddingBottom: scaleHeight(120),
    },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(28),
      fontWeight: '800',
      marginBottom: scaleHeight(8),
    },
    helper: {
      color: colors.textSecondary,
      fontSize: scaleFont(15),
      lineHeight: scaleFont(21),
      marginBottom: scaleHeight(18),
    },
    label: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
      fontWeight: '700',
      marginBottom: scaleHeight(10),
      marginTop: scaleHeight(18),
    },
    option: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.borderLight,
      borderWidth: proportionalSize(1),
      borderRadius: proportionalSize(8),
      padding: proportionalSize(14),
      marginBottom: scaleHeight(10),
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    optionTitle: {
      color: colors.textPrimary,
      fontSize: scaleFont(15),
      fontWeight: '700',
      marginBottom: scaleHeight(4),
    },
    optionDescription: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(18),
    },
    input: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.borderLight,
      borderWidth: proportionalSize(1),
      borderRadius: proportionalSize(8),
      padding: proportionalSize(14),
      color: colors.textPrimary,
      fontSize: scaleFont(15),
    },
    notes: { minHeight: scaleHeight(86), textAlignVertical: 'top' },
    button: { marginTop: scaleHeight(22) },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Analyze a clip</Text>
        <Text style={s.helper}>
          Keep the camera angle controlled and make sure both hands, wrists,
          shoulders, and the pad/snare are visible.
        </Text>

        <Text style={s.label}>Exercise</Text>
        {exercises.map(exercise => (
          <TouchableOpacity
            key={exercise.value}
            style={[
              s.option,
              exercise.value === exerciseType ? s.optionActive : null,
            ]}
            onPress={() => setExerciseType(exercise.value)}
          >
            <Text style={s.optionTitle}>{exercise.label}</Text>
            <Text style={s.optionDescription}>{exercise.description}</Text>
          </TouchableOpacity>
        ))}

        <Text style={s.label}>Tempo target</Text>
        <TextInput
          value={tempoTarget}
          onChangeText={setTempoTarget}
          placeholder="Optional BPM"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          style={s.input}
        />

        <Text style={s.label}>Practice clip</Text>
        <MediaUploader selectedUri={videoUri} onVideoSelected={setVideoUri} />

        <Text style={s.label}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional setup notes"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[s.input, s.notes]}
        />

        <Button
          label={createSession.isPending ? 'Creating Analysis...' : 'Upload and Analyze'}
          onPress={submit}
          disabled={createSession.isPending}
          style={s.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default NewSessionScreen;
