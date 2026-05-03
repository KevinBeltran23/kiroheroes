import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { getUserFacingMessage } from '../../services/errorHandler';

function NewSessionScreen() {
  const [projectName, setProjectName] = useState('');
  const [notes, setNotes] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    setIsSubmitting(true);

    // The mutation creates the session doc instantly and kicks off
    // upload + analysis in the background.  We navigate to the status
    // screen as soon as we have a sessionId.
    createSession.mutate(
      {
        exerciseType: 'single_strokes',
        projectName: projectName.trim(),
        notes,
        videoUri,
      },
      {
        onSuccess: (result) => {
          // Reset form so coming back doesn't show stale data
          setProjectName('');
          setNotes('');
          setVideoUri(null);
          setIsSubmitting(false);
          navigation.navigate('SessionStatus', {
            sessionId: result.sessionId,
          });
        },
        onError: (error) => {
          setIsSubmitting(false);
          Alert.alert('Upload failed', getUserFacingMessage(error));
        },
      },
    );
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
        <Text style={s.title}>New project</Text>
        <Text style={s.helper}>
          Record or upload a short clip with your upper body and pad/snare
          visible so MediaPipe can track shoulders, elbows, wrists, and hands.
        </Text>

        <Text style={s.label}>Project name</Text>
        <TextInput
          value={projectName}
          onChangeText={setProjectName}
          placeholder="Front Ensemble Block - Day 4"
          placeholderTextColor={colors.textTertiary}
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
          label={isSubmitting ? 'Uploading…' : 'Save Rep and Analyze'}
          onPress={submit}
          disabled={isSubmitting}
          style={s.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default NewSessionScreen;
