/** Wrap AMap-style callbacks so hung network requests cannot leave UI spinning forever. */
export function guardAmapCallback(
  timeoutMs: number,
  callback: (...args: any[]) => void,
  onTimeout?: () => void,
) {
  let settled = false;
  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      onTimeout?.();
    }
  }, timeoutMs);
  return (...args: any[]) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    callback(...args);
  };
}

export const AMAP_CALLBACK_TIMEOUT_MS = 10_000;
