/**
 * Debounce a void callback. Leading call schedules; trailing fires after waitMs.
 */
export function createDebouncedCallback(
  fn: () => void,
  waitMs: number,
): {run: () => void; cancel: () => void} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    run: () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, waitMs);
    },
    cancel: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
