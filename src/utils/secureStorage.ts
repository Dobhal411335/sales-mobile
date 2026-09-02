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

export async function getAuthTokens(): Promise<AuthTokens> {
  const payload = await readPayload();
  return {
    accessToken: payload.accessToken ?? null,
    refreshToken: payload.refreshToken ?? null,
    deviceToken: payload.deviceToken ?? null,
  };
}

export async function setAuthToken(
  name: keyof typeof AUTH_COOKIE_NAMES,
  value: string | null,
): Promise<void> {
  const payload = await readPayload();
  if (name === 'ACCESS') {
    payload.accessToken = value;
  } else if (name === 'REFRESH') {
    payload.refreshToken = value;
  } else if (name === 'DEVICE') {
    payload.deviceToken = value;
  }
  await writePayload(payload);
}

export async function setAuthTokens(tokens: Partial<AuthTokens>): Promise<void> {
  const current = await readPayload();
  await writePayload({
    accessToken:
      tokens.accessToken !== undefined ? tokens.accessToken : current.accessToken,
    refreshToken:
      tokens.refreshToken !== undefined ? tokens.refreshToken : current.refreshToken,
    deviceToken:
      tokens.deviceToken !== undefined ? tokens.deviceToken : current.deviceToken,
  });
}

/** Clears employee session tokens; device_token is preserved (matches web logout). */
export async function clearEmployeeSessionTokens(): Promise<void> {
  const payload = await readPayload();
  await writePayload({
    accessToken: null,
    refreshToken: null,
    deviceToken: payload.deviceToken ?? null,
  });
}

export async function clearAllAuthTokens(): Promise<void> {
  await removeSecret(AUTH_STORAGE_KEY);
}

export async function buildCookieHeader(): Promise<string | null> {
  const {accessToken, refreshToken, deviceToken} = await getAuthTokens();
  const parts: string[] = [];
  if (deviceToken) {
    parts.push(`${AUTH_COOKIE_NAMES.DEVICE}=${deviceToken}`);
  }
  if (accessToken) {
    parts.push(`${AUTH_COOKIE_NAMES.ACCESS}=${accessToken}`);
  }
  if (refreshToken) {
    parts.push(`${AUTH_COOKIE_NAMES.REFRESH}=${refreshToken}`);
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

export async function hasSessionTokens(): Promise<boolean> {
  const {accessToken, refreshToken} = await getAuthTokens();
  return Boolean(accessToken || refreshToken);
}

export async function hasDeviceToken(): Promise<boolean> {
  const {deviceToken} = await getAuthTokens();
  return Boolean(deviceToken);
}
