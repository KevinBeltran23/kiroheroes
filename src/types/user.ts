export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any;
  darkMode: boolean;
  colorBlindMode: 'none' | 'red-green';
  highContrast: boolean;
  hasAcceptedTerms?: boolean;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  handedness?: 'right' | 'left' | 'ambidextrous';
}
