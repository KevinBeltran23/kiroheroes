import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAnalysisResultBySession,
  listUserSessions,
  getSession,
  subscribeToAnalysisJob,
  subscribeToAnalysisResult,
} from '../firebase';
import { AnalysisJob, AnalysisResult } from '../../types/analysis';

export const sessionsQueryKey = (userId: string) => ['sessions', userId];
export const sessionQueryKey = (sessionId: string) => ['session', sessionId];
export const analysisResultQueryKey = (sessionId: string) => [
  'analysisResult',
  sessionId,
];
export const analysisJobQueryKey = (jobId: string) => ['analysisJob', jobId];

export function useSessionsQuery(userId?: string) {
  return useQuery({
    queryKey: sessionsQueryKey(userId || ''),
    queryFn: () => listUserSessions(userId!),
    enabled: !!userId,
  });
}

export function useSessionQuery(sessionId?: string) {
  return useQuery({
    queryKey: sessionQueryKey(sessionId || ''),
    queryFn: () => getSession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useAnalysisResultQuery(sessionId?: string) {
  return useQuery({
    queryKey: analysisResultQueryKey(sessionId || ''),
    queryFn: () => getAnalysisResultBySession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useLiveAnalysisJob(jobId?: string | null) {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return undefined;
    }
    return subscribeToAnalysisJob(jobId, setJob, setError);
  }, [jobId]);

  return { job, error };
}

export function useLiveAnalysisResult(sessionId?: string | null) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setResult(null);
      return undefined;
    }
    return subscribeToAnalysisResult(sessionId, setResult, setError);
  }, [sessionId]);

  return { result, error };
}
