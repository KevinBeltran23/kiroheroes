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
  primary: '#F2B705',
  primaryLight: '#161A1F',
  primaryDark: '#C79604',
  secondary: '#38C55D',
  secondaryLight: '#102418',
  secondaryDark: '#249546',
  accent: '#2E8BFF',
  accentLight: '#0F223D',
  accentDark: '#1B65BF',
  success: '#38C55D',
  warning: '#F2B705',
  error: '#FC6262',
  info: '#2E8BFF',
  fullyAccessible: '#38C55D',
  partiallyAccessible: '#F2B705',
  limitedAccessibility: '#FF9F1C',
  notAccessible: '#FC6262',
  unknownAccessibility: '#9AA5B1',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F4F7FA',
  gray100: '#DDE4EA',
  gray200: '#C7D0D9',
  gray300: '#9AA5B1',
  gray400: '#74808D',
  gray500: '#596573',
  gray600: '#3D4752',
  gray700: '#27313B',
  gray800: '#151B22',
  gray900: '#070A0E',
  background: '#070A0E',
  backgroundSecondary: '#10151B',
  backgroundTertiary: '#151B22',
  textPrimary: '#F4F7FA',
  textSecondary: '#9AA5B1',
  textTertiary: '#74808D',
  textInverse: '#070A0E',
  border: '#27313B',
  borderLight: '#27313B',
  borderDark: '#3D4752',
  shadow: 'rgba(0, 0, 0, 0.45)',
  shadowLight: 'rgba(0, 0, 0, 0.2)',
  shadowDark: 'rgba(0, 0, 0, 0.65)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

export const useColors = (): Colors => appColors;
