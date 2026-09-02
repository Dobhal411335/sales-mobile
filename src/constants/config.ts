import {API_BASE_URL} from './apiConfig';

/**
 * App configuration.
 * Set API_BASE_URL in src/constants/apiConfig.ts for your environment.
 */
export const config = {
  API_BASE_URL: API_BASE_URL.trim(),
  APP_NAME: 'Tasty Bites',
  APP_SUBTITLE: 'SALES POS',
} as const;
