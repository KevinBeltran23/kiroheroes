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

      const session = await createSession({
        userId: authUser.uid,
        exerciseType: input.exerciseType,
        tempoTarget: input.tempoTarget ?? null,
        notes: input.notes,
        projectName: input.projectName,
        drumHeightInches: input.drumHeightInches,
        cameraAngle: input.cameraAngle,
      });

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

      return { sessionId: session.id, jobId: job.id };
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
