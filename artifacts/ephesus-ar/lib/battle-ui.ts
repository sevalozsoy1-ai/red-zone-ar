export type BattleUiRoomStatus = 'lobby' | 'active' | 'finished' | undefined;

export function isBattleCombatDisabled({
  hasBattleSession,
  roomStatus,
  roomError,
  cameraLive,
  ownPlayerAlive,
  adOpen,
  reloading,
  actionLocked = false,
}: {
  hasBattleSession: boolean;
  roomStatus: BattleUiRoomStatus;
  roomError: boolean;
  cameraLive: boolean;
  ownPlayerAlive: boolean;
  adOpen: boolean;
  reloading: boolean;
  actionLocked?: boolean;
}): boolean {
  if (!cameraLive || adOpen || reloading || actionLocked) return true;
  if (!hasBattleSession) return false;
  return roomError || roomStatus !== 'active' || !ownPlayerAlive;
}

export function battleHudStatus({
  hasBattleSession,
  roomStatus,
  roomError,
  cameraLive,
  hasActiveOpponent,
}: {
  hasBattleSession: boolean;
  roomStatus: BattleUiRoomStatus;
  roomError: boolean;
  cameraLive?: boolean;
  hasActiveOpponent: boolean;
}): 'error' | 'finished' | 'camera' | 'waiting' | 'ready' | 'local' {
  if (!hasBattleSession) return 'local';
  if (roomError) return 'error';
  if (roomStatus === 'finished') return 'finished';
  if (cameraLive === false) return 'camera';
  return hasActiveOpponent ? 'ready' : 'waiting';
}

export function isGoneBattleSession(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const responseStatus = 'status' in error
    ? (error as { status?: unknown }).status
    : undefined;
  // The API uses 404 for a room/session that was removed and may use a more
  // explicit auth/expiration status once the server has reaped an inactive
  // player.  None of these statuses represent a transport interruption.
  if (responseStatus === 401 || responseStatus === 403 || responseStatus === 404 || responseStatus === 410) {
    return true;
  }

  const data = 'data' in error
    ? (error as { data?: unknown }).data
    : undefined;
  if (!data || typeof data !== 'object') return false;
  const code = (data as { error?: unknown; code?: unknown }).error
    ?? (data as { code?: unknown }).code;
  return typeof code === 'string'
    && /^(?:SESSION_(?:EXPIRED|INVALID|NOT_FOUND)|PLAYER_(?:EXPIRED|NOT_FOUND)|ROOM_NOT_FOUND|UNAUTHORIZED)$/.test(code);
}

export function tryAcquireBattleShot(inFlight: { current: boolean }): boolean {
  if (inFlight.current) return false;
  inFlight.current = true;
  return true;
}

export function releaseBattleShot(inFlight: { current: boolean }): void {
  inFlight.current = false;
}

export type BattleTargetCandidate = {
  id: string;
  alive: boolean;
  connected: boolean;
  markerId?: number;
};

export function shouldApplyBattleSnapshot(
  current: { updatedAt?: unknown } | null | undefined,
  incoming: { updatedAt?: unknown } | null | undefined,
): boolean {
  const incomingRevision = incoming?.updatedAt;
  if (typeof incomingRevision !== 'number' || !Number.isFinite(incomingRevision)) return false;
  const currentRevision = current?.updatedAt;
  return typeof currentRevision !== 'number'
    || !Number.isFinite(currentRevision)
    || incomingRevision >= currentRevision;
}

/**
 * Keep the client-side network target rules in one place.  In particular, a
 * player retained for reconnect grace is not a shootable target.
 */
export function getNetworkTarget(
  players: BattleTargetCandidate[] | undefined,
  ownPlayerId: string | undefined,
): { target: BattleTargetCandidate | null; reason: 'OFFLINE' | 'NO_OPPONENT' | 'NO_TARGET' | null } {
  const opponents = (players ?? []).filter((player) =>
    player.id !== ownPlayerId && player.alive && player.connected
  );
  if (opponents.length === 0) {
    const hasConnectedOpponent = (players ?? []).some((player) =>
      player.id !== ownPlayerId && player.connected
    );
    return { target: null, reason: hasConnectedOpponent ? 'NO_TARGET' : 'NO_OPPONENT' };
  }
  return {
    target: opponents[0] ?? null,
    reason: null,
  };
}

/**
 * Camera confirmation is independent from the presence lease. If the camera
 * can currently see an alive opponent's room marker, a delayed heartbeat must
 * not turn that physical observation into a miss.
 */
export function getMarkerTarget(
  players: BattleTargetCandidate[] | undefined,
  ownPlayerId: string | undefined,
  markerId: number | null,
): BattleTargetCandidate | null {
  if (markerId === null) return null;
  return (players ?? []).find((player) =>
    player.id !== ownPlayerId
    && player.alive
    && player.markerId === markerId
  ) ?? null;
}
