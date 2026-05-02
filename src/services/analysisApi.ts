import { ExerciseType } from '../types/analysis';

const ANALYSIS_API_URL = process.env.EXPO_PUBLIC_ANALYSIS_API_URL;

export async function requestAnalysis(input: {
  jobId: string;
  sessionId: string;
  userId: string;
  inputVideoPath: string;
  exerciseType: ExerciseType;
}) {
  if (!ANALYSIS_API_URL) {
    throw new Error(
      'Missing EXPO_PUBLIC_ANALYSIS_API_URL. Restart Metro after setting .env.local or rebuild with EAS env vars.',
    );
  }

  const analyzeUrl = `${ANALYSIS_API_URL.replace(/\/$/, '')}/analyze`;
  console.log('[analysis-api] POST', analyzeUrl);

  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Analysis request failed: ${response.status} ${body}`);
  }

  return response.json();
}
