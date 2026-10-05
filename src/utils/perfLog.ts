import {config} from '../constants/config';

/**
 * Lightweight timing helper for diagnosing Mobile POS latency.
 * Logs only in __DEV__. Use around Keychain, list fetches, session create, hydrate.
 */
export function perfMark(label: string): () => void {
  if (!__DEV__) {
    return () => undefined;
  }
  const start = Date.now();
  return () => {
    const ms = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[perf] ${label}: ${ms}ms`);
  };
}

export async function perfTimed<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const done = perfMark(label);
  try {
    return await fn();
  } finally {
    done();
  }
}

/** Log once at bootstrap so device API host is obvious vs Web localhost. */
let loggedApiHost = false;
export function logApiHostOnce(): void {
  if (!__DEV__ || loggedApiHost) {
    return;
  }
  loggedApiHost = true;
  // eslint-disable-next-line no-console
  console.log(
    `[perf] API_BASE_URL=${config.API_BASE_URL || '(unset)'} ` +
      `(compare with Web: localhost vs LAN vs production)`,
  );
}
