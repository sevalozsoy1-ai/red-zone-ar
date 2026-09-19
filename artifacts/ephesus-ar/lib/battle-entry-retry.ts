export const BATTLE_ENTRY_RETRY_DELAYS_MS = [700, 1500] as const;

type ErrorWithDetails = {
  status?: unknown;
  code?: unknown;
  error?: unknown;
  message?: unknown;
  name?: unknown;
  data?: unknown;
  response?: { status?: unknown };
  originalError?: unknown;
  cause?: unknown;
};

const SEMANTIC_ERROR_CODES = /^(?:ROOM_(?:NOT_FOUND|FULL|CLOSED)|INVALID_(?:REQUEST|NAME|CODE|INPUT)|SESSION_(?:EXPIRED|INVALID|NOT_FOUND)|PLAYER_(?:EXPIRED|NOT_FOUND)|UNAUTHORIZED|FORBIDDEN)$/;
const INITIALIZING_ERROR_CODES = /^(?:SERVER_(?:INITIALIZING|NOT_READY)|SERVICE_UNAVAILABLE|STORE_(?:INITIALIZING|NOT_READY)|DATABASE_(?:INITIALIZING|NOT_READY)|E(?:BUSY|AGAIN|CONNRESET|CONNREFUSED|TIMEDOUT))$/;
const TRANSIENT_MESSAGE = /network request failed|failed to fetch|fetch failed|network error|timed out|timeout|connection reset|connection closed|connection refused|temporarily unavailable|try again|econn(?:reset|refused|aborted)|enotfound/i;

function details(error: unknown): ErrorWithDetails {
  return error && typeof error === "object" ? error as ErrorWithDetails : {};
}

function errorCode(error: unknown): string | undefined {
  const value = details(error);
  const data = value.data && typeof value.data === "object" ? value.data as ErrorWithDetails : {};
  const code = value.code ?? data.code ?? data.error ?? data.message;
  return typeof code === "string" ? code.toUpperCase() : undefined;
}

function errorStatus(error: unknown): number | undefined {
  const value = details(error);
  const status = value.status ?? value.response?.status;
  return typeof status === "number" && Number.isFinite(status) ? status : undefined;
}

function hasTransientTransportShape(error: unknown, seen = new Set<unknown>()): boolean {
  if (seen.has(error)) return false;
  seen.add(error);
  if (typeof error === "string") return TRANSIENT_MESSAGE.test(error) || /API_CONNECTION/i.test(error);
  if (!error || typeof error !== "object") return false;

  const value = details(error);
  const name = typeof value.name === "string" ? value.name : "";
  const message = typeof value.message === "string" ? value.message : "";
  if (name === "ApiConnectionError" || name === "AbortError" || /API_CONNECTION/i.test(message)) return true;
  if (TRANSIENT_MESSAGE.test(message) || /aborted|abort/i.test(message)) return true;

  const nested = [value.originalError, value.cause, value.error, value.data]
    .filter((candidate) => candidate && typeof candidate === "object" || typeof candidate === "string");
  return nested.some((candidate) => hasTransientTransportShape(candidate, seen));
}

/**
 * Entry create/join is safe to repeat only for transport/server readiness
 * failures. Semantic 4xx responses must be shown immediately to the player.
 */
export function shouldRetryBattleEntry(error: unknown): boolean {
  const code = errorCode(error);
  if (code && SEMANTIC_ERROR_CODES.test(code)) return false;
  if (code && INITIALIZING_ERROR_CODES.test(code)) return true;

  const status = errorStatus(error);
  if (status !== undefined) {
    if (status >= 500 && status <= 599) return true;
    if (status >= 400 && status <= 499) return false;
  }

  return hasTransientTransportShape(error);
}

export async function retryBattleEntry<T>(
  operation: () => Promise<T>,
  options: {
    onRetry?: (retryNumber: number, delayMs: number) => void;
    isCancelled?: () => boolean;
    sleep?: (delayMs: number) => Promise<void>;
  } = {},
): Promise<T> {
  const sleep = options.sleep ?? ((delayMs) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  let retryNumber = 0;

  while (true) {
    if (options.isCancelled?.()) throw new Error("BATTLE_ENTRY_CANCELLED");
    try {
      return await operation();
    } catch (error) {
      if (!shouldRetryBattleEntry(error) || retryNumber >= BATTLE_ENTRY_RETRY_DELAYS_MS.length) {
        throw error;
      }
      const delayMs = BATTLE_ENTRY_RETRY_DELAYS_MS[retryNumber];
      retryNumber += 1;
      options.onRetry?.(retryNumber, delayMs);
      await sleep(delayMs);
    }
  }
}