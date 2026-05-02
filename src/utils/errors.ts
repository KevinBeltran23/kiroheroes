export const isErrorWithCode = (
  error: unknown,
): error is Error & { code: string } => {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
};
