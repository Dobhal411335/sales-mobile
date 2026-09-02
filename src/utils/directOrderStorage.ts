import AsyncStorage from '@react-native-async-storage/async-storage';
import {DIRECT_ORDER_STORAGE_KEYS} from '../types/orderContext';

export async function getDirectOrderId(key: string): Promise<string | null> {
  const value = await AsyncStorage.getItem(key);
  return value?.trim() || null;
}

export async function setDirectOrderId(key: string, orderId: string): Promise<void> {
  await AsyncStorage.setItem(key, orderId);
}

export async function clearDirectOrderId(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export {DIRECT_ORDER_STORAGE_KEYS};
