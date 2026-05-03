export interface Colors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  fullyAccessible: string;
  partiallyAccessible: string;
  limitedAccessibility: string;
  notAccessible: string;
  unknownAccessibility: string;
  white: string;
  black: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  borderLight: string;
  borderDark: string;
  shadow: string;
  shadowLight: string;
  shadowDark: string;
  overlay: string;
  overlayLight: string;
}

const appColors: Colors = {
  primary: '#3B7BF6',
  primaryLight: '#0F1D33',
  primaryDark: '#2C5FBF',
  secondary: '#38C55D',
  secondaryLight: '#102418',
  secondaryDark: '#249546',
  accent: '#3B7BF6',
  accentLight: '#0F223D',
  accentDark: '#2C5FBF',
  success: '#38C55D',
  warning: '#F2B705',
  error: '#FC6262',
  info: '#3B7BF6',
  fullyAccessible: '#38C55D',
  partiallyAccessible: '#F2B705',
  limitedAccessibility: '#FF9F1C',
  notAccessible: '#FC6262',
  unknownAccessibility: '#7B8BA3',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F0F2F5',
  gray100: '#D8DEE6',
  gray200: '#C0C8D4',
  gray300: '#7B8BA3',
  gray400: '#5A6A80',
  gray500: '#455468',
  gray600: '#2E3D50',
  gray700: '#1A2233',
  gray800: '#0D1219',
  gray900: '#060A10',
  background: '#060A10',
  backgroundSecondary: '#0D1219',
  backgroundTertiary: '#111820',
  textPrimary: '#F0F2F5',
  textSecondary: '#7B8BA3',
  textTertiary: '#5A6A80',
  textInverse: '#FFFFFF',
  border: '#1A2233',
  borderLight: '#1A2233',
  borderDark: '#2E3D50',
  shadow: 'rgba(0, 0, 0, 0.45)',
  shadowLight: 'rgba(0, 0, 0, 0.2)',
  shadowDark: 'rgba(0, 0, 0, 0.65)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

export const useColors = (): Colors => appColors;
