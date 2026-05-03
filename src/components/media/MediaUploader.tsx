import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import { VIDEO_RECORDED_EVENT } from '../../screens/main/VideoRecorderScreen';

interface MediaUploaderProps {
  selectedUri?: string | null;
  onVideoSelected: (uri: string) => void;
}

function MediaUploader({ selectedUri, onVideoSelected }: MediaUploaderProps) {
  const [loading, setLoading] = useState(false);
  const colors = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  // Listen for videos coming back from the recorder screen
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      VIDEO_RECORDED_EVENT,
      (event: { uri: string }) => {
        if (event?.uri) {
          onVideoSelected(event.uri);
        }
      },
    );
    return () => sub.remove();
  }, [onVideoSelected]);

  const openRecorder = () => {
    navigation.navigate('VideoRecorder');
  };

  const pickFromLibrary = async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
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
      borderRadius: proportionalSize(10),
      borderWidth: proportionalSize(1),
      borderStyle: 'dashed',
      borderColor: colors.primary,
      overflow: 'hidden',
    },
    loadingContainer: {
      minHeight: scaleHeight(120),
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: scaleHeight(8),
      color: colors.primary,
      fontSize: scaleFont(14),
    },

    /* empty state */
    emptyWrap: {
      padding: proportionalSize(16),
      minHeight: scaleHeight(120),
      justifyContent: 'center',
    },
    helper: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
      lineHeight: scaleFont(18),
      marginBottom: scaleHeight(14),
    },
    row: {
      flexDirection: 'row',
      gap: scaleWidth(10),
      justifyContent: 'space-between',
    },
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: proportionalSize(6),
      backgroundColor: colors.primary,
      paddingVertical: scaleHeight(12),
      paddingHorizontal: scaleWidth(10),
      borderRadius: proportionalSize(8),
    },
    secondaryBtn: {
      backgroundColor: colors.background,
      borderColor: colors.primary,
      borderWidth: proportionalSize(1),
    },
    btnText: {
      color: colors.textInverse,
      fontWeight: '600',
      fontSize: scaleFont(14),
      textAlign: 'center',
    },
    secondaryText: { color: colors.primary },

    /* preview state */
    previewWrap: {
      position: 'relative',
    },
    video: {
      width: '100%',
      height: scaleHeight(180),
      backgroundColor: '#000',
    },
    previewActions: {
      flexDirection: 'row',
      gap: scaleWidth(8),
      padding: proportionalSize(12),
    },
    changeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: proportionalSize(6),
      paddingVertical: scaleHeight(10),
      borderRadius: proportionalSize(8),
      borderWidth: 1,
      borderColor: colors.borderDark,
      backgroundColor: colors.backgroundTertiary,
    },
    changeBtnText: {
      color: colors.textSecondary,
      fontSize: scaleFont(13),
      fontWeight: '600',
    },
    readyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: proportionalSize(4),
      paddingVertical: scaleHeight(6),
      backgroundColor: 'rgba(56,197,93,0.1)',
    },
    readyText: {
      color: colors.success,
      fontSize: scaleFont(12),
      fontWeight: '700',
    },
  });

  if (loading) {
    return (
      <View style={[s.container, s.loadingContainer]}>
        <ActivityIndicator size={proportionalSize(30)} color={colors.primary} />
        <Text style={s.loadingText}>Opening video picker…</Text>
      </View>
    );
  }

  // ── Video selected: show preview ──
  if (selectedUri) {
    return (
      <View style={s.container}>
        <View style={s.previewWrap}>
          <Video
            source={{ uri: selectedUri }}
            style={s.video}
            resizeMode="contain"
            controls
            paused
          />
        </View>
        <View style={s.readyBadge}>
          <Icon
            name="check-circle"
            size={proportionalSize(14)}
            color={colors.success}
          />
          <Text style={s.readyText}>Video ready for upload</Text>
        </View>
        <View style={s.previewActions}>
          <TouchableOpacity style={s.changeBtn} onPress={openRecorder}>
            <Icon
              name="video-outline"
              size={proportionalSize(16)}
              color={colors.textSecondary}
            />
            <Text style={s.changeBtnText}>Re-record</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.changeBtn} onPress={pickFromLibrary}>
            <Icon
              name="folder-open-outline"
              size={proportionalSize(16)}
              color={colors.textSecondary}
            />
            <Text style={s.changeBtnText}>Choose Different</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── No video: show picker buttons ──
  return (
    <View style={s.container}>
      <View style={s.emptyWrap}>
        <Text style={s.helper}>
          Use a controlled 15–30 second clip with your upper body and pad/snare
          visible.
        </Text>
        <View style={s.row}>
          <TouchableOpacity style={s.btn} onPress={openRecorder}>
            <Icon
              name="video-outline"
              size={proportionalSize(18)}
              color={colors.textInverse}
            />
            <Text style={s.btnText}>Record Clip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.secondaryBtn]}
            onPress={pickFromLibrary}
          >
            <Icon
              name="folder-open-outline"
              size={proportionalSize(18)}
              color={colors.primary}
            />
            <Text style={[s.btnText, s.secondaryText]}>Choose Video</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default MediaUploader;
