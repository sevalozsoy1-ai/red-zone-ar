export function removePendingShotIntent<T extends { shotId: string }>(
  pending: Map<string, T>,
  shotId: string,
) {
  pending.delete(shotId);
}

export function nextShotRetryDelay(
  attempt: number,
  maxAttempts: number,
  baseDelayMs = 350,
): number | null {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt >= maxAttempts) return null;
  return baseDelayMs * attempt;
}