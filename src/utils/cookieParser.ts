import {AUTH_COOKIE_NAMES, setAuthTokens} from './secureStorage';

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
 * Parse Set-Cookie headers and batch-persist auth tokens in one Keychain write.
 */
export async function persistCookiesFromResponse(
  headers: AxiosHeaders | undefined,
): Promise<void> {
  const setCookieLines = normalizeSetCookieHeader(headers);
  if (setCookieLines.length === 0) {
    return;
  }

  const patch: {
    accessToken?: string | null;
    refreshToken?: string | null;
    deviceToken?: string | null;
  } = {};

  for (const line of setCookieLines) {
    const access = extractCookieValue(line, AUTH_COOKIE_NAMES.ACCESS);
    if (access) {
      patch.accessToken = access;
    } else if (
      line.startsWith(`${AUTH_COOKIE_NAMES.ACCESS}=`) &&
      line.includes('Max-Age=0')
    ) {
      patch.accessToken = null;
    }

    const refresh = extractCookieValue(line, AUTH_COOKIE_NAMES.REFRESH);
    if (refresh) {
      patch.refreshToken = refresh;
    } else if (
      line.startsWith(`${AUTH_COOKIE_NAMES.REFRESH}=`) &&
      line.includes('Max-Age=0')
    ) {
      patch.refreshToken = null;
    }

    const device = extractCookieValue(line, AUTH_COOKIE_NAMES.DEVICE);
    if (device) {
      patch.deviceToken = device;
    }
  }

  if (
    patch.accessToken === undefined &&
    patch.refreshToken === undefined &&
    patch.deviceToken === undefined
  ) {
    return;
  }

  await setAuthTokens(patch);
}
