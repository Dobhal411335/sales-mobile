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
 * Stores a secret value securely when Keychain is linked and functional;
 * otherwise gracefully falls back to AsyncStorage so auth, session, and
 * fingerprint storage continue working on sideloaded/unsigned devices (e.g. Sideloadly/AltStore/Simulator).
 */
export async function getSecret(service: string): Promise<string | null> {
  if (isKeychainAvailable()) {
    try {
      const credentials = await Keychain.getGenericPassword({service});
      if (credentials && typeof credentials.password === 'string') {
        return credentials.password;
      }
    } catch {
      // Missing entitlement (errSecMissingEntitlement -34018) occurs on sideloaded iOS apps.
      // Mark keychain unavailable for this session and fall back to AsyncStorage.
      keychainAvailability = false;
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
    try {
      await Keychain.setGenericPassword('secret', value, {
        service,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    } catch {
      // Sideloaded iOS apps (Sideloadly / free Apple ID / unsigned) lack keychain access entitlements
      // causing Keychain.setGenericPassword to fail with errSecMissingEntitlement (-34018).
      // Mark Keychain as unavailable and fall back to AsyncStorage so login and session never fail.
      keychainAvailability = false;
    }
  }

  await AsyncStorage.setItem(service, value);
}

export async function removeSecret(service: string): Promise<void> {
  if (isKeychainAvailable()) {
    try {
      await Keychain.resetGenericPassword({service});
    } catch {
      keychainAvailability = false;
    }
  }

  try {
    await AsyncStorage.removeItem(service);
  } catch {
    // Ignore missing entries.
  }
}

export function usesKeychainStorage(): boolean {
  return Boolean(isKeychainAvailable());
}
