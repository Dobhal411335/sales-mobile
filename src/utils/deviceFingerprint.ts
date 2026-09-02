import {Platform} from 'react-native';
import {getSecret, setSecret} from './secretStorage';

const FINGERPRINT_STORAGE_KEY = 'com.tastybitesmobile.fingerprint';

function getPlatformDeviceContext(): string {
  const constants = Platform.constants as {
    Brand?: string;
    Manufacturer?: string;
    Model?: string;
    Fingerprint?: string;
    systemName?: string;
  };

  const brand =
    constants.Brand || constants.Manufacturer || constants.systemName || 'unknown';
  const model = constants.Model || 'unknown';
  const version = String(Platform.Version);

  return `${Platform.OS}-${brand}-${model}-${version}`;
}

async function getOrCreateInstallId(): Promise<string> {
  const existing = await getSecret(FINGERPRINT_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const installId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await setSecret(FINGERPRINT_STORAGE_KEY, installId);
  return installId;
}

/**
 * Stable device fingerprint for EmployeeSession.browserFingerprint.
 * Web uses: btoa(userAgent + language).substring(0, 32).toLowerCase()
 */
export async function getDeviceFingerprint(): Promise<string> {
  const installId = await getOrCreateInstallId();
  const source = `${getPlatformDeviceContext()}-${installId}`;
  const normalized = source.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return normalized.substring(0, 32).padEnd(32, '0');
}
