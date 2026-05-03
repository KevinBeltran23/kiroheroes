import {
  FirebaseFirestoreTypes,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import {
  AnalysisSession,
  ExerciseType,
  SessionStatus,
} from '../../types/analysis';

const db = getFirestore();
export const SESSIONS_COLLECTION = 'sessions';

function mapSessionDoc(
  docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot | FirebaseFirestoreTypes.DocumentSnapshot,
): AnalysisSession {
  return { id: docSnap.id, ...docSnap.data() } as AnalysisSession;
}

export async function createSession(input: {
  userId: string;
  exerciseType: ExerciseType;
  tempoTarget?: number | null;
  notes?: string;
  projectName?: string;
  drumHeightInches?: number | null;
  cameraAngle?: AnalysisSession['cameraAngle'];
}): Promise<AnalysisSession> {
  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
    userId: input.userId,
    exerciseType: input.exerciseType,
    tempoTarget: input.tempoTarget ?? null,
    notes: input.notes ?? '',
    projectName: input.projectName ?? '',
    drumHeightInches: input.drumHeightInches ?? null,
    cameraAngle: input.cameraAngle ?? 'front',
    rawVideoPath: null,
    latestJobId: null,
    status: 'draft',
    processorVersion: 'analysis-api-v0',
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    userId: input.userId,
    exerciseType: input.exerciseType,
    tempoTarget: input.tempoTarget ?? null,
    notes: input.notes ?? '',
    projectName: input.projectName ?? '',
    drumHeightInches: input.drumHeightInches ?? null,
    cameraAngle: input.cameraAngle ?? 'front',
    rawVideoPath: null,
    latestJobId: null,
    status: 'draft',
    processorVersion: 'analysis-api-v0',
    createdAt: new Date(),
  };
}

export async function getSession(sessionId: string): Promise<AnalysisSession | null> {
  const snapshot = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
  return snapshot.exists() ? mapSessionDoc(snapshot) : null;
}

export async function listUserSessions(
  userId: string,
  limitCount = 25,
): Promise<AnalysisSession[]> {
  const snapshot = await getDocs(
    query(
      collection(db, SESSIONS_COLLECTION),
      where('userId', '==', userId),
      limit(limitCount),
    ),
  );
  return snapshot.docs.map(mapSessionDoc).sort((a: AnalysisSession, b: AnalysisSession) => {
    const left = a.createdAt?.toMillis?.() ?? 0;
    const right = b.createdAt?.toMillis?.() ?? 0;
    return right - left;
  });
}

export async function updateSession(
  sessionId: string,
  data: Partial<AnalysisSession> & { status?: SessionStatus },
): Promise<void> {
  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), data);
}

export function subscribeToSession(
  sessionId: string,
  onNext: (session: AnalysisSession | null) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, SESSIONS_COLLECTION, sessionId),
    snapshot =>
      onNext(snapshot.exists() ? mapSessionDoc(snapshot) : null),
    error => onError?.(error),
  );
}
