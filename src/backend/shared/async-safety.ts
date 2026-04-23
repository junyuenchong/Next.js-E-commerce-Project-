/**
 * Log an error with a stable context prefix.
 */
export function logErrorWithContext(prefix: string, error: unknown): void {
  console.error(prefix, error);
}

/**
 * Run an async task and map failures to a fallback value.
 */
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

/**
 * Run an async task and swallow errors after logging.
 */
export async function runSafelyVoid(
  task: () => Promise<void>,
  logPrefix: string,
): Promise<void> {
  await runSafely(task, (error) => {
    // Keep utility/module failures non-fatal for callers.
    logErrorWithContext(logPrefix, error);
  });
}
