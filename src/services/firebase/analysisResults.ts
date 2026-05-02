import {
  FirebaseFirestoreTypes,
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from '@react-native-firebase/firestore';
import { AnalysisResult } from '../../types/analysis';

const db = getFirestore();
export const ANALYSIS_RESULTS_COLLECTION = 'analysisResults';

function mapResultDoc(
  snapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot,
): AnalysisResult {
  return { id: snapshot.id, ...snapshot.data() } as AnalysisResult;
}

export async function getAnalysisResultBySession(
  sessionId: string,
): Promise<AnalysisResult | null> {
  const snapshot = await getDocs(
    query(
      collection(db, ANALYSIS_RESULTS_COLLECTION),
      where('sessionId', '==', sessionId),
      limit(1),
    ),
  );
  return snapshot.empty ? null : mapResultDoc(snapshot.docs[0]);
}

export function subscribeToAnalysisResult(
  sessionId: string,
  onNext: (result: AnalysisResult | null) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(db, ANALYSIS_RESULTS_COLLECTION),
      where('sessionId', '==', sessionId),
      limit(1),
    ),
    snapshot => onNext(snapshot.empty ? null : mapResultDoc(snapshot.docs[0])),
    error => onError?.(error),
  );
}

export async function createMockAnalysisResult(input: {
  sessionId: string;
  userId: string;
}): Promise<void> {
  await addDoc(collection(db, ANALYSIS_RESULTS_COLLECTION), {
    sessionId: input.sessionId,
    userId: input.userId,
    summaryScores: {
      timing: 82,
      symmetry: 74,
      strokeConsistency: 78,
      postureStability: 86,
      overall: 80,
    },
    metrics: [
      {
        id: 'timing_cv',
        label: 'Timing variation',
        value: 8.4,
        unit: '%',
        description: 'Estimated stroke interval variation.',
      },
      {
        id: 'height_delta',
        label: 'Hand height mismatch',
        value: 12,
        unit: '%',
        description: 'Estimated average difference between hands.',
      },
    ],
    flags: [
      {
        id: 'mock-right-height',
        severity: 'warning',
        title: 'Right hand rises higher after the midpoint',
        explanation:
          'Motion traces suggest the right hand uses a larger stroke height in the second half.',
        startTime: 9.2,
        endTime: 14.8,
      },
    ],
    timelineEvents: [
      {
        id: 'mock-drift',
        time: 11.4,
        label: 'Tempo drift begins',
        severity: 'info',
      },
      {
        id: 'mock-height',
        time: 13.1,
        label: 'Height asymmetry peak',
        severity: 'warning',
      },
    ],
    feedbackItems: [
      {
        id: 'mock-slow-down',
        type: 'timing',
        severity: 'info',
        title: 'Slow the exercise slightly',
        explanation:
          'The clip appears more repeatable early on than near the end.',
        suggestion:
          'Drop the tempo by 8-12 BPM and keep the rebound height matched for both hands.',
        timeRanges: [{ start: 9.2, end: 14.8 }],
      },
    ],
    chartSeries: {
      leftHandMotion: [42, 55, 50, 63, 58, 67, 61, 64],
      rightHandMotion: [45, 59, 56, 72, 70, 78, 76, 81],
      timingDrift: [0, 1, 1, 3, 5, 6, 8, 9],
      consistency: [88, 86, 84, 82, 79, 76, 74, 72],
    },
    artifactPaths: {},
    isMock: true,
    createdAt: serverTimestamp(),
  });
}
