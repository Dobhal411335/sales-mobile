import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules} from 'react-native';
import * as Keychain from 'react-native-keychain';

let keychainAvailability: boolean | null = null;

function isKeychainAvailable(): boolean {
  if (keychainAvailability !== null) {
    return keychainAvailability;
  }

  const nativeModule =
    NativeModules.RNKeychainManager ?? NativeModules.RNKeychainModule;
  keychainAvailability = nativeModule != null;
  return keychainAvailability;
}

/**
 * Stores a secret value securely when Keychain is linked; otherwise falls back
 * to AsyncStorage so auth works before a native rebuild (less secure).
 */
export async function getSecret(service: string): Promise<string | null> {
  if (isKeychainAvailable()) {
    try {
      const credentials = await Keychain.getGenericPassword({service});
      if (credentials && typeof credentials.password === 'string') {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  }

  try {
    return await AsyncStorage.getItem(service);
  } catch {
    return null;
  }
}

export async function setSecret(service: string, value: string): Promise<void> {
  if (isKeychainAvailable()) {
    await Keychain.setGenericPassword('secret', value, {
      service,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return;
  }

  await AsyncStorage.setItem(service, value);
}

export async function removeSecret(service: string): Promise<void> {
  if (isKeychainAvailable()) {
    try {
      await Keychain.resetGenericPassword({service});
    } catch {
      // Ignore missing entries.
    }
    return;
  }

  try {
    await AsyncStorage.removeItem(service);
  } catch {
    // Ignore missing entries.
  }
}

export function usesKeychainStorage(): boolean {
  return isKeychainAvailable();
}
