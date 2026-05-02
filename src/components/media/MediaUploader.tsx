import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface MediaUploaderProps {
  selectedUri?: string | null;
  onVideoSelected: (uri: string) => void;
}

function MediaUploader({ selectedUri, onVideoSelected }: MediaUploaderProps) {
  const [loading, setLoading] = useState(false);
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  const selectVideo = async (source: 'camera' | 'library') => {
    try {
      setLoading(true);
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              allowsEditing: false,
              quality: 1,
              videoMaxDuration: 30,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              allowsEditing: false,
              quality: 1,
            });

      if (!result.canceled && result.assets[0]?.uri) {
        onVideoSelected(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Video Error', 'Failed to select a video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const s = StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(16),
      borderWidth: proportionalSize(1),
      borderStyle: 'dashed',
      borderColor: colors.primary,
      minHeight: scaleHeight(120),
      justifyContent: 'center',
    },
    loadingContainer: { alignItems: 'center' },
    loadingText: {
      marginTop: scaleHeight(8),
      color: colors.primary,
      fontSize: scaleFont(14),
    },
    row: {
      flexDirection: 'row',
      gap: scaleWidth(10),
      justifyContent: 'space-between',
    },
    btn: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: scaleHeight(12),
      paddingHorizontal: scaleWidth(10),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
    },
    secondaryBtn: {
      backgroundColor: colors.background,
      borderColor: colors.primary,
      borderWidth: proportionalSize(1),
    },
    btnText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(15),
      textAlign: 'center',
    },
    secondaryText: { color: colors.primary },
    helper: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(18),
      marginBottom: scaleHeight(14),
    },
    selected: {
      color: colors.success,
      fontSize: scaleFont(13),
      marginTop: scaleHeight(12),
      fontWeight: '600',
    },
  });

  if (loading) {
    return (
      <View style={[s.container, s.loadingContainer]}>
        <ActivityIndicator size={proportionalSize(30)} color={colors.primary} />
        <Text style={s.loadingText}>Opening video picker...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.helper}>
        Use a controlled 15-30 second clip with your upper body and pad/snare
        visible.
      </Text>
      <View style={s.row}>
        <TouchableOpacity style={s.btn} onPress={() => selectVideo('camera')}>
          <Text style={s.btnText}>Record Clip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, s.secondaryBtn]}
          onPress={() => selectVideo('library')}
        >
          <Text style={[s.btnText, s.secondaryText]}>Choose Video</Text>
        </TouchableOpacity>
      </View>
      {!!selectedUri && <Text style={s.selected}>Video ready for upload</Text>}
    </View>
  );
}

export default MediaUploader;
