import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import { RootStackParamList } from '../../navigation/types';

type IconName = React.ComponentProps<typeof Icon>['name'];

const ui = {
  bg: '#000000',
  overlay: 'rgba(0,0,0,0.55)',
  white: '#FFFFFF',
  red: '#FC4444',
  muted: 'rgba(255,255,255,0.6)',
  blue: '#3B7BF6',
};

/** Event name used to pass the recorded URI back to MediaUploader. */
export const VIDEO_RECORDED_EVENT = 'video-recorder:recorded';

function VideoRecorderScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cameraRef = useRef<CameraView>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Request permissions on mount
  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, [
    cameraPermission,
    micPermission,
    requestCameraPermission,
    requestMicPermission,
  ]);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return;
    setIsRecording(true);
    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: 30,
      });
      if (result?.uri) {
        setRecordedUri(result.uri);
      }
    } catch {
      // recording was stopped or failed
    } finally {
      setIsRecording(false);
    }
  }, [cameraReady]);

  const stopRecording = useCallback(() => {
    cameraRef.current?.stopRecording();
  }, []);

  const handleUseVideo = useCallback(() => {
    if (recordedUri) {
      DeviceEventEmitter.emit(VIDEO_RECORDED_EVENT, { uri: recordedUri });
      navigation.goBack();
    }
  }, [navigation, recordedUri]);

  const handleReRecord = useCallback(() => {
    setRecordedUri(null);
    setElapsed(0);
  }, []);

  const handleCancel = useCallback(() => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
    }
    navigation.goBack();
  }, [isRecording, navigation]);

  // ── Permission gate ──
  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={s.permissionContainer}>
        <Icon name="camera-off" size={48} color={ui.muted} />
        <Text style={s.permissionText}>
          Camera and microphone access are required to record video.
        </Text>
        <Pressable
          style={s.permissionBtn}
          onPress={() => {
            requestCameraPermission();
            requestMicPermission();
          }}
        >
          <Text style={s.permissionBtnText}>Grant Access</Text>
        </Pressable>
        <Pressable style={s.cancelBtn} onPress={handleCancel}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // ── Review recorded video ──
  if (recordedUri) {
    return (
      <View style={s.root}>
        <Video
          source={{ uri: recordedUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          repeat
          controls
        />
        <View style={s.reviewOverlay}>
          <View style={s.reviewBar}>
            <Pressable style={s.reviewBtn} onPress={handleReRecord}>
              <Icon name="refresh" size={22} color={ui.white} />
              <Text style={s.reviewBtnText}>Re-record</Text>
            </Pressable>
            <Pressable
              style={[s.reviewBtn, s.reviewBtnPrimary]}
              onPress={handleUseVideo}
            >
              <Icon name="check" size={22} color={ui.white} />
              <Text style={s.reviewBtnText}>Use Video</Text>
            </Pressable>
          </View>
        </View>
        {/* Close button */}
        <Pressable style={s.closeBtn} onPress={handleCancel}>
          <Icon name="close" size={26} color={ui.white} />
        </Pressable>
      </View>
    );
  }

  // ── Camera recording view ──
  return (
    <View style={s.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="video"
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable style={s.closeBtn} onPress={handleCancel}>
          <Icon name="close" size={26} color={ui.white} />
        </Pressable>
        {isRecording && (
          <View style={s.timerBadge}>
            <View style={s.timerDot} />
            <Text style={s.timerText}>{formatTime(elapsed)}</Text>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View style={s.bottomBar}>
        <Text style={s.hint}>
          {isRecording
            ? 'Recording… tap to stop'
            : 'Hold device in landscape. Tap to record.'}
        </Text>
        <Pressable
          style={[s.recordBtn, isRecording && s.recordBtnActive]}
          onPress={isRecording ? stopRecording : startRecording}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <View
            style={isRecording ? s.recordSquare : s.recordCircleInner}
          />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ui.bg,
  },

  /* permissions */
  permissionContainer: {
    flex: 1,
    backgroundColor: ui.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: {
    color: ui.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionBtn: {
    backgroundColor: ui.blue,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  permissionBtnText: {
    color: ui.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    color: ui.muted,
    fontSize: 14,
    fontWeight: '600',
  },

  /* top bar */
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 10,
  },
  timerBadge: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -36 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252,68,68,0.85)',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 6,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ui.white,
  },
  timerText: {
    color: ui.white,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  /* bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 28,
    paddingTop: 14,
    backgroundColor: ui.overlay,
  },
  hint: {
    color: ui.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: ui.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnActive: {
    borderColor: ui.red,
  },
  recordCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ui.red,
  },
  recordSquare: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: ui.red,
  },

  /* review */
  reviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  reviewBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: ui.overlay,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  reviewBtnPrimary: {
    backgroundColor: ui.blue,
    borderColor: ui.blue,
  },
  reviewBtnText: {
    color: ui.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default VideoRecorderScreen;
