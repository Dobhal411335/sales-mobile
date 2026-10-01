/**
 * Restaurant wall-clock helpers for mobile (aligned with Web restaurantTime).
 * Default America/Toronto; override with RESTAURANT_TIMEZONE / NEXT_PUBLIC_RESTAURANT_TIMEZONE.
 */
export const DEFAULT_RESTAURANT_TIMEZONE =
  (typeof process !== 'undefined' &&
    (process.env.RESTAURANT_TIMEZONE ||
      process.env.NEXT_PUBLIC_RESTAURANT_TIMEZONE)) ||
  'America/Toronto';

/** YYYY-MM-DD for the restaurant wall clock. */
export function todayRestaurantISO(
  timeZone: string = DEFAULT_RESTAURANT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatTimeInRestaurantTz(
  date: Date | string | number | null | undefined,
  timeZone: string = DEFAULT_RESTAURANT_TIMEZONE,
): string {
  if (!date) {
    return '';
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}
