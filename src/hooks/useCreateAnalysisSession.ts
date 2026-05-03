import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  createAnalysisJob,
  createMockAnalysisResult,
  createSession,
  updateAnalysisJob,
  updateSession,
  uploadSessionVideo,
} from '../services/firebase';
import { requestAnalysis } from '../services/analysisApi';
import { ExerciseType } from '../types/analysis';
import { sessionsQueryKey } from '../services/store/analysisQueries';

const USE_MOCK_ANALYSIS = process.env.EXPO_PUBLIC_USE_MOCK_ANALYSIS === 'true';

/**
 * Creates a session doc immediately and returns { sessionId } so the caller
 * can navigate to the status screen right away.  The heavy work (upload,
 * job creation, analysis request) runs in the background — the status screen
 * picks up live Firestore updates as each phase completes.
 */
export function useCreateAnalysisSession() {
  const { authUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      exerciseType: ExerciseType;
      tempoTarget?: number | null;
      notes?: string;
      projectName?: string;
      drumHeightInches?: number | null;
      cameraAngle?: 'front' | 'front_left' | 'front_right' | 'side';
      videoUri: string;
    }) => {
      if (!authUser) {
        throw new Error('You must be signed in to analyze a clip.');
      }

      // ── Phase 1: create session doc (fast) ──
      const session = await createSession({
        userId: authUser.uid,
        exerciseType: input.exerciseType,
        tempoTarget: input.tempoTarget ?? null,
        notes: input.notes,
        projectName: input.projectName,
        drumHeightInches: input.drumHeightInches,
        cameraAngle: input.cameraAngle,
      });

      // Return immediately so the UI can navigate to the status screen.
      // Kick off the heavy work in the background.
      const backgroundWork = async () => {
        try {
          await updateSession(session.id, { status: 'uploading' });

          const upload = await uploadSessionVideo({
            uri: input.videoUri,
            userId: authUser.uid,
            sessionId: session.id,
          });

          await updateSession(session.id, {
            rawVideoPath: upload.path,
            status: 'queued',
          });

          const job = await createAnalysisJob({
            sessionId: session.id,
            userId: authUser.uid,
            inputVideoPath: upload.path,
          });

          await updateSession(session.id, { latestJobId: job.id });

          if (USE_MOCK_ANALYSIS) {
            await updateAnalysisJob(job.id, { status: 'processing' });
            await createMockAnalysisResult({
              sessionId: session.id,
              userId: authUser.uid,
            });
            await updateAnalysisJob(job.id, {
              status: 'completed',
              completedAt: new Date(),
            });
            await updateSession(session.id, { status: 'completed' });
          } else {
            await requestAnalysis({
              jobId: job.id,
              sessionId: session.id,
              userId: authUser.uid,
              inputVideoPath: upload.path,
              exerciseType: input.exerciseType,
            });
          }
        } catch (error) {
          // Mark the session as failed so the status screen shows the error.
          await updateSession(session.id, {
            status: 'failed',
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Upload or analysis request failed.',
          }).catch(() => {
            // Best-effort — if this also fails there's nothing more we can do.
          });
        } finally {
          if (authUser) {
            queryClient.invalidateQueries({
              queryKey: sessionsQueryKey(authUser.uid),
            });
          }
        }
      };

      // Fire and forget — don't await
      backgroundWork();

      return { sessionId: session.id };
    },
    onSuccess: () => {
      if (authUser) {
        queryClient.invalidateQueries({
          queryKey: sessionsQueryKey(authUser.uid),
        });
      }
    },
  });
}
