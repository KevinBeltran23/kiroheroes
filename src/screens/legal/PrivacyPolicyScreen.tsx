import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Button from '../../components/common/Button';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';

function PrivacyPolicyScreen() {
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
      <Text style={s.title}>Privacy Policy</Text>
      <Text style={s.body}>
        Kiroheroes stores account profile data, submitted practice session
        metadata, uploaded videos, and generated analysis artifacts in Firebase.
      </Text>
      <Text style={s.body}>
        Videos are used to generate motion consistency feedback for the session
        you submit. The MVP does not train a custom model from your clips.
      </Text>
      <Text style={s.body}>
        Analysis output should be treated as software-generated motion
        observations, not expert instruction or medical assessment.
      </Text>
      <Button label="Back" onPress={() => navigation.goBack()} style={s.button} />
    </ScrollView>
  );
}

export default PrivacyPolicyScreen;
