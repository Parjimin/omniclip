export async function retry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    minDelayMs?: number;
    maxDelayMs?: number;
    factor?: number;
  },
): Promise<T> {
  const retries = options?.retries ?? 2;
  const minDelayMs = options?.minDelayMs ?? 600;
  const maxDelayMs = options?.maxDelayMs ?? 3000;
  const factor = options?.factor ?? 2;

  let attempt = 0;
  let delay = minDelayMs;
  let latestError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      latestError = error;
      if (attempt === retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(maxDelayMs, Math.round(delay * factor));
      attempt += 1;
    }
  }

  throw latestError;
}
