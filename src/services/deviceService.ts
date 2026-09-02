import {
  activateDevice,
  getDeviceStatus,
} from './authService';
import {getDeviceFingerprint} from '../utils/deviceFingerprint';
import type {ActivateDeviceCredentials} from '../types/auth';

export const deviceService = {
  getStatus: getDeviceStatus,
  activate: activateDevice,
  getFingerprint: getDeviceFingerprint,
};

export type {ActivateDeviceCredentials};
