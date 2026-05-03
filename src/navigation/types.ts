export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Main: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  About: undefined;
  TermsAcceptance: undefined;
  SessionStatus: { sessionId: string; jobId?: string };
  Results: { sessionId: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  NewSessionTab: undefined;
  SettingsTab: undefined;
};
