import {AUTH_COOKIE_NAMES, setAuthToken} from './secureStorage';

type AxiosHeaders = Record<string, unknown>;

function normalizeSetCookieHeader(
  headers: AxiosHeaders | undefined,
): string[] {
  if (!headers) {
    return [];
  }

  const raw =
    headers['set-cookie'] ??
    headers['Set-Cookie'] ??
    headers['SET-COOKIE'];

  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => (typeof entry === 'string' ? [entry] : []));
  }

  if (typeof raw === 'string') {
    return [raw];
  }

  return [];
}

function extractCookieValue(setCookieLine: string, cookieName: string): string | null {
  const prefix = `${cookieName}=`;
  const start = setCookieLine.indexOf(prefix);
  if (start === -1) {
    return null;
  }

  const valueStart = start + prefix.length;
  const semicolonIndex = setCookieLine.indexOf(';', valueStart);
  const value =
    semicolonIndex === -1
      ? setCookieLine.slice(valueStart)
      : setCookieLine.slice(valueStart, semicolonIndex);

  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Parse Set-Cookie headers from an axios response and persist auth tokens.
 */
export async function persistCookiesFromResponse(
  headers: AxiosHeaders | undefined,
): Promise<void> {
  const setCookieLines = normalizeSetCookieHeader(headers);

  for (const line of setCookieLines) {
    const access = extractCookieValue(line, AUTH_COOKIE_NAMES.ACCESS);
    if (access) {
      await setAuthToken('ACCESS', access);
    }

    const refresh = extractCookieValue(line, AUTH_COOKIE_NAMES.REFRESH);
    if (refresh) {
      await setAuthToken('REFRESH', refresh);
    }

    const device = extractCookieValue(line, AUTH_COOKIE_NAMES.DEVICE);
    if (device) {
      await setAuthToken('DEVICE', device);
    }

    // Cleared cookies arrive as Max-Age=0 with empty value.
    if (line.startsWith(`${AUTH_COOKIE_NAMES.ACCESS}=`) && line.includes('Max-Age=0')) {
      await setAuthToken('ACCESS', null);
    }
    if (line.startsWith(`${AUTH_COOKIE_NAMES.REFRESH}=`) && line.includes('Max-Age=0')) {
      await setAuthToken('REFRESH', null);
    }
  }
}
