export type BattleQueryKey = readonly unknown[];

type BattleQueryResult = {
  error?: unknown;
};

export type BattleAppStateOptions = {
  hasSession: boolean;
  queryKey: BattleQueryKey;
  setAppActive: (active: boolean) => void;
  cancelQueries: (filters: { queryKey: BattleQueryKey; exact: true }) => Promise<unknown> | unknown;
  refetch: (options?: { cancelRefetch?: boolean }) => Promise<BattleQueryResult> | BattleQueryResult;
  isExpiredError?: (error: unknown) => boolean;
  onExpired?: (error: unknown) => void;
  onBackground?: () => void;
};

function notifyIfExpired(
  result: BattleQueryResult | unknown,
  isExpiredError: ((error: unknown) => boolean) | undefined,
  onExpired: ((error: unknown) => void) | undefined,
) {
  if (!isExpiredError || !onExpired || !result || typeof result !== "object" || !("error" in result)) return;
  const error = (result as BattleQueryResult).error;
  if (error !== undefined && isExpiredError(error)) onExpired(error);
}

/**
 * AppState deliberately owns cancellation as well as the enabled flag. Query
 * observers do not cancel an already-started fetch when `enabled` changes.
 */
export function handleBattleAppStateChange(nextState: string, options: BattleAppStateOptions): void {
  const active = nextState === "active";
  options.setAppActive(active);
  if (!options.hasSession) return;

  if (!active) {
    options.onBackground?.();
    void Promise.resolve(options.cancelQueries({ queryKey: options.queryKey, exact: true })).catch(() => undefined);
    return;
  }

  let refreshResult: Promise<BattleQueryResult> | BattleQueryResult;
  try {
    // React Query's default is to cancel an in-flight request when refetch is
    // called. Foreground recovery can race the normal interval, so leave that
    // request alone and let the observer share/settle it.
    refreshResult = options.refetch({ cancelRefetch: false });
  } catch (error) {
    if (options.isExpiredError?.(error)) options.onExpired?.(error);
    return;
  }

  void Promise.resolve(refreshResult)
    .then((result) => notifyIfExpired(result, options.isExpiredError, options.onExpired))
    .catch((error) => {
      if (options.isExpiredError?.(error)) options.onExpired?.(error);
    });
}

export type BattleLeaveConfirmation = {
  onConfirm: () => void;
  onCancel: () => void;
};

export type BattleHardwareBackOptions = {
  hasSession: boolean;
  sessionExpired?: boolean;
  leavePending?: boolean;
  onExit: () => void;
  onLeave: () => void;
  confirmLeave: (confirmation: BattleLeaveConfirmation) => void;
};

/**
 * Keeps Android Back behavior testable without importing React Native Alert or
 * BackHandler. The platform screen supplies the localized Alert implementation.
 */
export function handleBattleHardwareBack(options: BattleHardwareBackOptions): boolean {
  if (!options.hasSession || options.sessionExpired) {
    options.onExit();
    return true;
  }
  if (options.leavePending) return true;
  options.confirmLeave({
    onConfirm: options.onLeave,
    onCancel: () => undefined,
  });
  return true;
}