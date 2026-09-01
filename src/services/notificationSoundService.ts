import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform, Vibration} from 'react-native';
import type {Notification} from '../types/notification';

const SOUND_PREF_KEY = 'tastybites_notification_sound';
const PLAY_COOLDOWN_MS = 500;

interface NativeSound {
  stop: (callback?: () => void) => void;
  play: (callback?: (success: boolean) => void) => void;
}

interface SoundConstructor {
  MAIN_BUNDLE: string;
  setCategory: (category: string) => void;
  new (
    filename: string,
    basePath: string,
    callback: (error: Error | null) => void,
  ): NativeSound;
}

const playedIds = new Set<string>();
let lastPlayedAt = 0;
let bellSound: NativeSound | null = null;
let soundModuleEnabled = false;
let nativeSoundChecked = false;
let nativeSoundAvailable = false;
let SoundClass: SoundConstructor | null = null;

function loadSoundModule(): SoundConstructor | null {
  if (nativeSoundChecked) {
    return SoundClass;
  }

  nativeSoundChecked = true;

  if (Platform.OS === 'web') {
    SoundClass = null;
    return null;
  }

  if (!NativeModules.RNSound) {
    nativeSoundAvailable = false;
    SoundClass = null;
    return null;
  }

  try {
    const module = require('react-native-sound') as
      | {default: SoundConstructor}
      | SoundConstructor;
    const Sound = ('default' in module ? module.default : module) as SoundConstructor;
    Sound.setCategory('Playback');
    SoundClass = Sound;
    nativeSoundAvailable = true;
    return SoundClass;
  } catch {
    nativeSoundAvailable = false;
    SoundClass = null;
    return null;
  }
}

export function isSoundPlaybackAvailable(): boolean {
  return loadSoundModule() !== null;
}

function shouldPlayForNotification(notification: Notification): boolean {
  return (
    notification.playSound === true ||
    notification.priority === 'high' ||
    notification.type === 'EMPLOYEE_LOGIN'
  );
}

async function ensureBellLoaded(): Promise<NativeSound | null> {
  if (bellSound) {
    return bellSound;
  }

  const Sound = loadSoundModule();
  if (!Sound) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const sound = new Sound(
        'notification_bell.mp3',
        Sound.MAIN_BUNDLE,
        (error) => {
          if (error) {
            resolve(null);
            return;
          }
          bellSound = sound;
          resolve(sound);
        },
      );
    } catch {
      resolve(null);
    }
  });
}

export async function initNotificationSound(): Promise<void> {
  const pref = await AsyncStorage.getItem(SOUND_PREF_KEY);
  soundModuleEnabled = pref !== 'off';
  if (soundModuleEnabled) {
    await ensureBellLoaded();
  }
}

export async function getSoundEnabled(): Promise<boolean> {
  const pref = await AsyncStorage.getItem(SOUND_PREF_KEY);
  return pref !== 'off';
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  soundModuleEnabled = enabled;
  await AsyncStorage.setItem(SOUND_PREF_KEY, enabled ? 'on' : 'off');
  if (enabled) {
    await ensureBellLoaded();
  }
}

export async function playPreviewBell(): Promise<boolean> {
  const sound = await ensureBellLoaded();
  if (sound) {
    return new Promise((resolve) => {
      try {
        sound.stop(() => {
          sound.play((success) => {
            resolve(success);
          });
        });
      } catch {
        resolve(false);
      }
    });
  }

  if (Platform.OS !== 'web') {
    Vibration.vibrate(80);
  }
  return false;
}

export async function playNotificationSound(
  notification: Notification,
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const enabled = await getSoundEnabled();
  if (!enabled || !shouldPlayForNotification(notification)) {
    return;
  }

  const id = String(notification.id || notification._id || '');
  if (!id || playedIds.has(id)) {
    return;
  }

  const now = Date.now();
  if (now - lastPlayedAt < PLAY_COOLDOWN_MS) {
    return;
  }

  const sound = await ensureBellLoaded();
  if (!sound) {
    Vibration.vibrate(80);
    return;
  }

  playedIds.add(id);
  if (playedIds.size > 200) {
    const first = playedIds.values().next().value;
    if (first) {
      playedIds.delete(first);
    }
  }
  lastPlayedAt = now;

  try {
    sound.stop(() => {
      sound.play();
    });
  } catch {
    // Native sound module unavailable until app rebuild.
  }
}
