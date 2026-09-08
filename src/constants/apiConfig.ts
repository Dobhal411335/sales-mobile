/**
 * Backend URL for the Tasty Bites API.
 *
 * Injected at build time from Mobile/.env (API_BASE_URL).
 *
 * Supported environments:
 * - Android emulator: http://10.0.2.2:3000
 * - iOS simulator:    http://localhost:3000
 * - Physical device:  http://<your-lan-ip>:3000
 * - Production:       https://pos.tastybitesrestaurant.com
 *
 * Leave empty in .env to use mock data in services that support it.
 */
export const API_BASE_URL = (
  process.env.API_BASE_URL ?? 'http://10.0.2.2:3000'
).trim();
