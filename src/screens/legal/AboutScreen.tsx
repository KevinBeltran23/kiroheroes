import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';

function AboutScreen() {
  const colors = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: proportionalSize(20),
      paddingTop: scaleHeight(58),
      paddingBottom: scaleHeight(60),
    },
    icon: { alignSelf: 'center', marginBottom: scaleHeight(16) },
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(28),
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: scaleHeight(12),
    },
    body: {
      color: colors.textSecondary,
      fontSize: scaleFont(16),
      lineHeight: scaleFont(24),
      marginBottom: scaleHeight(14),
    },
    button: { marginTop: scaleHeight(16) },
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.icon}>
        <Icon name="metronome" color={colors.primary} size={scaleFont(44)} />
      </View>
      <Text style={s.title}>About Kiroheroes</Text>
      <Text style={s.body}>
        Kiroheroes is a post-processing drumming technique analysis app for short
        pad or snare practice clips.
      </Text>
      <Text style={s.body}>
        The app focuses on motion consistency, timing, left/right symmetry,
        stroke-height repeatability, and posture drift. It does not provide
        medical advice or claim expert diagnosis.
      </Text>
      <Button label="Back" onPress={() => navigation.goBack()} style={s.button} />
    </ScrollView>
  );
}

export default AboutScreen;
