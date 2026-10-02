/**
 * Backend URL for the Tasty Bites API.
 *
 * Injected at build time from Mobile env files (see babel.config.js):
 * - Dev / Metro:     `.env` then `.env.local` (local overrides)
 * - Release APK/IPA: `.env` then `.env.production` (never `.env.local`)
 *
 * Supported environments:
 * - Android emulator: http://10.0.2.2:3000
 * - iOS simulator:    http://localhost:3000
 * - Physical device:  http://<your-lan-ip>:3000
 * - Production:       https://pos.tastybitesrestaurant.com
 */
const PRODUCTION_API_URL = 'https://pos.tastybitesrestaurant.com';
const DEV_FALLBACK_URL = 'http://10.0.2.2:3000';

const fromEnv = (process.env.API_BASE_URL ?? '').trim();

export const API_BASE_URL = (
  fromEnv ||
  (process.env.NODE_ENV === 'production'
    ? PRODUCTION_API_URL
    : DEV_FALLBACK_URL)
).trim();
