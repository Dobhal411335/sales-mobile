import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DIRECT_ORDER_STORAGE_KEYS,
  LEGACY_DIRECT_ORDER_WALK_IN_KEY,
} from '../types/orderContext';

export async function getDirectOrderId(key: string): Promise<string | null> {
  const value = await AsyncStorage.getItem(key);
  if (value?.trim()) {
    return value.trim();
  }

  // Migrate legacy walk-in resume key → takeaway
  if (key === DIRECT_ORDER_STORAGE_KEYS.takeaway) {
    const legacy = await AsyncStorage.getItem(LEGACY_DIRECT_ORDER_WALK_IN_KEY);
    if (legacy?.trim()) {
      await AsyncStorage.setItem(key, legacy.trim());
      await AsyncStorage.removeItem(LEGACY_DIRECT_ORDER_WALK_IN_KEY);
      return legacy.trim();
    }
  }

  return null;
}

export async function setDirectOrderId(key: string, orderId: string): Promise<void> {
  await AsyncStorage.setItem(key, orderId);
  if (key === DIRECT_ORDER_STORAGE_KEYS.takeaway) {
    await AsyncStorage.removeItem(LEGACY_DIRECT_ORDER_WALK_IN_KEY);
  }
}

export async function clearDirectOrderId(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
  if (key === DIRECT_ORDER_STORAGE_KEYS.takeaway) {
    await AsyncStorage.removeItem(LEGACY_DIRECT_ORDER_WALK_IN_KEY);
  }
}

export {DIRECT_ORDER_STORAGE_KEYS};
