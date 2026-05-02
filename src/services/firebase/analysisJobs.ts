import {
  FirebaseFirestoreTypes,
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';
import { AnalysisJob, SessionStatus } from '../../types/analysis';

const db = getFirestore();
export const ANALYSIS_JOBS_COLLECTION = 'analysisJobs';

function mapJobDoc(
  snapshot: FirebaseFirestoreTypes.DocumentSnapshot,
): AnalysisJob | null {
  return snapshot.exists()
    ? ({ id: snapshot.id, ...snapshot.data() } as AnalysisJob)
    : null;
}

export async function createAnalysisJob(input: {
  sessionId: string;
  userId: string;
  inputVideoPath: string;
}): Promise<AnalysisJob> {
  const docRef = await addDoc(collection(db, ANALYSIS_JOBS_COLLECTION), {
    sessionId: input.sessionId,
    userId: input.userId,
    status: 'queued',
    queuedAt: serverTimestamp(),
    errorMessage: null,
    inputVideoPath: input.inputVideoPath,
    overlayVideoPath: null,
    thumbnailPath: null,
  });

  return {
    id: docRef.id,
    sessionId: input.sessionId,
    userId: input.userId,
    status: 'queued',
    queuedAt: new Date(),
    errorMessage: null,
    inputVideoPath: input.inputVideoPath,
  };
}

export function subscribeToAnalysisJob(
  jobId: string,
  onNext: (job: AnalysisJob | null) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, ANALYSIS_JOBS_COLLECTION, jobId),
    snapshot => onNext(mapJobDoc(snapshot)),
    error => onError?.(error),
  );
}

export async function updateAnalysisJob(
  jobId: string,
  data: Partial<AnalysisJob> & { status?: SessionStatus },
): Promise<void> {
  await updateDoc(doc(db, ANALYSIS_JOBS_COLLECTION, jobId), data);
}
