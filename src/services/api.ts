import axios from 'axios';
import {config} from '../constants/config';

/**
 * Shared Axios client for future Tasty Bites backend calls.
 * Do not point this at production until auth and base URL are configured.
 */
export const api = axios.create({
  baseURL: config.API_BASE_URL || undefined,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
