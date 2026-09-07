import {API_BASE_URL} from './apiConfig';

/**
 * App configuration.
 * Values are injected at build time from Mobile/.env or fallback to defaults.
 */
export const config = {
  API_BASE_URL: API_BASE_URL.trim(),
  APP_NAME: (process.env.APP_NAME ?? 'Tasty Bites').trim(),
  APP_SUBTITLE: (process.env.APP_SUBTITLE ?? 'SALES POS').trim(),
  DEFAULT_PRINTER_PORT: Number(process.env.DEFAULT_PRINTER_PORT) || 9100,
} as const;
