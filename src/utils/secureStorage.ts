import {getSecret, removeSecret, setSecret} from './secretStorage';

const AUTH_STORAGE_KEY = 'com.tastybitesmobile.auth';

export const AUTH_COOKIE_NAMES = {
  ACCESS: 'employee_access_token',
  REFRESH: 'employee_refresh_token',
  DEVICE: 'device_token',
} as const;

export type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
  deviceToken: string | null;
};

type StoredAuthPayload = {
  accessToken?: string | null;
  refreshToken?: string | null;
  deviceToken?: string | null;
};

/** In-memory cache so Axios does not hit Keychain on every request. */
let memoryTokens: AuthTokens | null = null;
let memoryCookieHeader: string | null | undefined;
let hydratePromise: Promise<AuthTokens> | null = null;

function tokensEqual(a: AuthTokens, b: AuthTokens): boolean {
  return (
    a.accessToken === b.accessToken &&
    a.refreshToken === b.refreshToken &&
    a.deviceToken === b.deviceToken
  );
}

function toTokens(payload: StoredAuthPayload): AuthTokens {
  return {
    accessToken: payload.accessToken ?? null,
    refreshToken: payload.refreshToken ?? null,
    deviceToken: payload.deviceToken ?? null,
  };
}

function buildCookieFromTokens(tokens: AuthTokens): string | null {
  const parts: string[] = [];
  if (tokens.deviceToken) {
    parts.push(`${AUTH_COOKIE_NAMES.DEVICE}=${tokens.deviceToken}`);
  }
  if (tokens.accessToken) {
    parts.push(`${AUTH_COOKIE_NAMES.ACCESS}=${tokens.accessToken}`);
  }
  if (tokens.refreshToken) {
    parts.push(`${AUTH_COOKIE_NAMES.REFRESH}=${tokens.refreshToken}`);
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

function setMemory(tokens: AuthTokens): void {
  memoryTokens = tokens;
  memoryCookieHeader = buildCookieFromTokens(tokens);
}

async function readPayload(): Promise<StoredAuthPayload> {
  const raw = await getSecret(AUTH_STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as StoredAuthPayload;
  } catch {
    return {};
  }
}

async function writePayload(payload: StoredAuthPayload): Promise<void> {
  await setSecret(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

async function hydrateFromDisk(): Promise<AuthTokens> {
  if (memoryTokens) {
    return memoryTokens;
  }
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const tokens = toTokens(await readPayload());
      setMemory(tokens);
      return tokens;
    })().finally(() => {
      hydratePromise = null;
    });
  }
  return hydratePromise;
}

export async function getAuthTokens(): Promise<AuthTokens> {
  return hydrateFromDisk();
}

/** Sync cookie header after hydrate — used by axios interceptor after warm cache. */
export function getCachedCookieHeader(): string | null | undefined {
  return memoryCookieHeader;
}

export async function setAuthToken(
  name: keyof typeof AUTH_COOKIE_NAMES,
  value: string | null,
): Promise<void> {
  const patch: Partial<AuthTokens> = {};
  if (name === 'ACCESS') {
    patch.accessToken = value;
  } else if (name === 'REFRESH') {
    patch.refreshToken = value;
  } else {
    patch.deviceToken = value;
  }
  await setAuthTokens(patch);
}

export async function setAuthTokens(tokens: Partial<AuthTokens>): Promise<void> {
  const current = await hydrateFromDisk();
  const next: AuthTokens = {
    accessToken:
      tokens.accessToken !== undefined ? tokens.accessToken : current.accessToken,
    refreshToken:
      tokens.refreshToken !== undefined
        ? tokens.refreshToken
        : current.refreshToken,
    deviceToken:
      tokens.deviceToken !== undefined ? tokens.deviceToken : current.deviceToken,
  };

  if (tokensEqual(current, next)) {
    return;
  }

  setMemory(next);
  await writePayload({
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    deviceToken: next.deviceToken,
  });
}

/** Clears employee session tokens; device_token is preserved (matches web logout). */
export async function clearEmployeeSessionTokens(): Promise<void> {
  const current = await hydrateFromDisk();
  const next: AuthTokens = {
    accessToken: null,
    refreshToken: null,
    deviceToken: current.deviceToken,
  };
  setMemory(next);
  await writePayload({
    accessToken: null,
    refreshToken: null,
    deviceToken: current.deviceToken ?? null,
  });
}

export async function clearAllAuthTokens(): Promise<void> {
  memoryTokens = {
    accessToken: null,
    refreshToken: null,
    deviceToken: null,
  };
  memoryCookieHeader = null;
  await removeSecret(AUTH_STORAGE_KEY);
}

export async function buildCookieHeader(): Promise<string | null> {
  if (memoryCookieHeader !== undefined) {
    return memoryCookieHeader;
  }
  const tokens = await hydrateFromDisk();
  return buildCookieFromTokens(tokens);
}

export async function hasSessionTokens(): Promise<boolean> {
  const {accessToken, refreshToken} = await getAuthTokens();
  return Boolean(accessToken || refreshToken);
}

export async function hasDeviceToken(): Promise<boolean> {
  const {deviceToken} = await getAuthTokens();
  return Boolean(deviceToken);
}
