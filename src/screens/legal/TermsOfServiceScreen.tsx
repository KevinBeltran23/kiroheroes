import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Button from '../../components/common/Button';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';

function TermsOfServiceScreen() {
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
    title: {
      color: colors.textPrimary,
      fontSize: scaleFont(28),
      fontWeight: '800',
      marginBottom: scaleHeight(16),
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
      <Text style={s.title}>Terms of Service</Text>
      <Text style={s.body}>
        Kiroheroes provides post-processing analysis for short drumming practice
        clips. Results are heuristic motion observations and may be incomplete
        or inaccurate when framing, lighting, or landmark detection is weak.
      </Text>
      <Text style={s.body}>
        Do not rely on the app for medical assessment, injury diagnosis, or
        definitive technique judgment. Use feedback as a practice aid.
      </Text>
      <Button label="Back" onPress={() => navigation.goBack()} style={s.button} />
    </ScrollView>
  );
}

export default TermsOfServiceScreen;
