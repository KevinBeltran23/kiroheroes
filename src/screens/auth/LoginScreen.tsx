import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserFacingMessage } from '../../services/errorHandler';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/* ── colour tokens matching the screenshot ── */
const ui = {
  bg: '#060A10',
  card: '#0D1219',
  cardBorder: '#1A2233',
  inputBg: '#0D1219',
  inputBorder: '#1A2233',
  blue: '#3B7BF6',
  blueDark: '#2C5FBF',
  blueGlow: 'rgba(59,123,246,0.25)',
  text: '#F0F2F5',
  muted: '#7B8BA3',
  white: '#FFFFFF',
  ring: '#3B7BF6',
  ringBg: 'rgba(59,123,246,0.08)',
};

function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signIn, signInWithGoogle } = useAuth();
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Login Failed', getUserFacingMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Google Sign-In Failed', getUserFacingMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  /* ── dynamic styles ── */
  const s = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: ui.bg,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: proportionalSize(24),
      paddingVertical: scaleHeight(40),
    },

    /* logo area */
    logoWrap: {
      alignItems: 'center',
      marginBottom: scaleHeight(32),
    },
    logoRing: {
      width: proportionalSize(110),
      height: proportionalSize(110),
      borderRadius: proportionalSize(55),
      borderWidth: 3,
      borderColor: ui.ring,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ui.ringBg,
      marginBottom: scaleHeight(20),
    },
    logoStick: {
      position: 'absolute',
      width: 3,
      height: proportionalSize(120),
      backgroundColor: ui.ring,
      transform: [{ rotate: '-45deg' }],
    },
    logoLetter: {
      fontSize: scaleFont(48),
      fontWeight: '800',
      color: ui.white,
    },
    heading: {
      fontSize: scaleFont(26),
      fontWeight: '700',
      color: ui.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: scaleFont(14),
      color: ui.muted,
      textAlign: 'center',
      marginTop: scaleHeight(6),
    },

    /* form card */
    card: {
      backgroundColor: ui.card,
      borderRadius: proportionalSize(16),
      borderWidth: 1,
      borderColor: ui.cardBorder,
      padding: proportionalSize(20),
      marginTop: scaleHeight(28),
    },

    /* inputs */
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ui.inputBg,
      borderWidth: 1,
      borderColor: ui.inputBorder,
      borderRadius: proportionalSize(10),
      paddingHorizontal: proportionalSize(14),
      marginBottom: scaleHeight(14),
      height: scaleHeight(52),
    },
    inputIcon: {
      marginRight: proportionalSize(10),
    },
    input: {
      flex: 1,
      color: ui.text,
      fontSize: scaleFont(15),
      paddingVertical: 0,
    },
    eyeBtn: {
      padding: proportionalSize(4),
    },

    /* remember / forgot row */
    optionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scaleHeight(18),
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: proportionalSize(20),
      height: proportionalSize(20),
      borderRadius: proportionalSize(4),
      borderWidth: 1.5,
      borderColor: ui.blue,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: proportionalSize(8),
    },
    checkboxChecked: {
      backgroundColor: ui.blue,
    },
    rememberText: {
      fontSize: scaleFont(13),
      color: ui.muted,
    },
    forgotText: {
      fontSize: scaleFont(13),
      color: ui.blue,
      fontWeight: '500',
    },

    /* login button */
    loginBtn: {
      backgroundColor: ui.blue,
      borderRadius: proportionalSize(10),
      height: scaleHeight(50),
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginBtnDisabled: {
      backgroundColor: ui.blueDark,
      opacity: 0.6,
    },
    loginBtnText: {
      color: ui.white,
      fontSize: scaleFont(16),
      fontWeight: '700',
    },

    /* divider */
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: scaleHeight(18),
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: ui.cardBorder,
    },
    dividerText: {
      marginHorizontal: proportionalSize(12),
      fontSize: scaleFont(13),
      color: ui.muted,
    },

    /* google button */
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: proportionalSize(10),
      borderWidth: 1,
      borderColor: ui.cardBorder,
      height: scaleHeight(48),
      backgroundColor: 'transparent',
    },
    googleIcon: {
      marginRight: proportionalSize(8),
    },
    googleText: {
      fontSize: scaleFont(14),
      color: ui.text,
      fontWeight: '500',
    },

    /* sign-up link */
    signUpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: scaleHeight(22),
    },
    signUpLabel: {
      fontSize: scaleFont(14),
      color: ui.muted,
    },
    signUpLink: {
      fontSize: scaleFont(14),
      color: ui.blue,
      fontWeight: '600',
      marginLeft: proportionalSize(4),
    },
  });

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo ── */}
        <View style={s.logoWrap}>
          <View style={s.logoRing}>
            <View style={s.logoStick} />
            <Text style={s.logoLetter}>S</Text>
          </View>
          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.subtitle}>Log in to continue your journey.</Text>
        </View>

        {/* ── Form card ── */}
        <View style={s.card}>
          {/* Email */}
          <View style={s.inputWrap}>
            <Icon
              name="email-outline"
              size={proportionalSize(20)}
              color={ui.muted}
              style={s.inputIcon}
            />
            <TextInput
              style={s.input}
              placeholder="Email address"
              placeholderTextColor={ui.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={s.inputWrap}>
            <Icon
              name="lock-outline"
              size={proportionalSize(20)}
              color={ui.muted}
              style={s.inputIcon}
            />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={ui.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              style={s.eyeBtn}
              onPress={() => setShowPassword(prev => !prev)}
              accessibilityLabel={
                showPassword ? 'Hide password' : 'Show password'
              }
              accessibilityRole="button"
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={proportionalSize(20)}
                color={ui.muted}
              />
            </TouchableOpacity>
          </View>

          {/* Remember me / Forgot */}
          <View style={s.optionsRow}>
            <TouchableOpacity
              style={s.checkRow}
              onPress={() => setRememberMe(prev => !prev)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
            >
              <View
                style={[s.checkbox, rememberMe && s.checkboxChecked]}
              >
                {rememberMe && (
                  <Icon name="check" size={proportionalSize(14)} color={ui.white} />
                )}
              </View>
              <Text style={s.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Log In */}
          <TouchableOpacity
            style={[s.loginBtn, isLoading && s.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
          >
            <Text style={s.loginBtnText}>
              {isLoading ? 'Logging in…' : 'Log In'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={s.googleBtn}
            onPress={handleGoogleLogin}
            disabled={isLoading}
            accessibilityRole="button"
          >
            <Icon
              name="google"
              size={proportionalSize(18)}
              color={ui.text}
              style={s.googleIcon}
            />
            <Text style={s.googleText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Sign up */}
        <View style={s.signUpRow}>
          <Text style={s.signUpLabel}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={s.signUpLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default LoginScreen;
