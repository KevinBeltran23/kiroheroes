export type ExerciseType = 'single_strokes' | 'double_strokes' | 'paradiddles';

export type SessionStatus =
  | 'draft'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type FindingSeverity = 'info' | 'warning' | 'critical';

export interface SummaryScores {
  timing: number;
  symmetry: number;
  strokeConsistency: number;
  postureStability: number;
  overall: number;
}

export interface AnalysisMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  description: string;
}

export interface AnalysisFlag {
  id: string;
  severity: FindingSeverity;
  title: string;
  explanation: string;
  startTime: number;
  endTime?: number;
}

export interface TimelineEvent {
  id: string;
  time: number;
  label: string;
  severity: FindingSeverity;
}

export interface FeedbackItem {
  id: string;
  type: 'timing' | 'symmetry' | 'height' | 'path' | 'posture';
  severity: FindingSeverity;
  title: string;
  explanation: string;
  suggestion: string;
  timeRanges?: Array<{ start: number; end: number }>;
}

export interface AnalysisSession {
  id: string;
  userId: string;
  createdAt: any;
  exerciseType: ExerciseType;
  tempoTarget?: number | null;
  rawVideoPath?: string | null;
  status: SessionStatus;
  notes?: string;
  processorVersion?: string;
  latestJobId?: string | null;
  errorMessage?: string | null;
}

export interface AnalysisJob {
  id: string;
  sessionId: string;
  userId: string;
  status: SessionStatus;
  queuedAt: any;
  startedAt?: any;
  completedAt?: any;
  errorMessage?: string | null;
  inputVideoPath: string;
  overlayVideoPath?: string | null;
  thumbnailPath?: string | null;
}

export interface HandResult {
  label: 'arm-heavy' | 'fulcrum-lift' | 'lead-by-the-bead' | 'wrist-break';
  explanation: string;
  fingerPct: number;
  wristPct: number;
  armPct: number;
  compactness: number;
}

export interface AnalysisResult {
  id: string;
  sessionId: string;
  userId: string;
  summaryScores: SummaryScores;
  metrics: AnalysisMetric[];
  flags: AnalysisFlag[];
  timelineEvents: TimelineEvent[];
  feedbackItems: FeedbackItem[];
  chartSeries: {
    leftHandMotion: number[];
    rightHandMotion: number[];
    timingDrift: number[];
    consistency: number[];
  };
  rightHand?: HandResult;
  leftHand?: HandResult;
  overallSummary?: string;
  artifactPaths?: {
    overlayVideoPath?: string | null;
    thumbnailPath?: string | null;
  };
  createdAt: any;
  isMock?: boolean;
}
