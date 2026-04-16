export function logErrorWithContext(prefix: string, error: unknown): void {
  console.error(prefix, error);
}

export async function runSafely<T>(
  task: () => Promise<T>,
  onError: (error: unknown) => T,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    return onError(error);
  }
}

export async function runSafelyVoid(
  task: () => Promise<void>,
  logPrefix: string,
): Promise<void> {
  await runSafely(task, (error) => {
    // Keep utility/module failures non-fatal for callers.
    logErrorWithContext(logPrefix, error);
  });
}
