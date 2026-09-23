import { createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";

export type RoomStatus = "lobby" | "active" | "finished";
export type BattleEffectKind = "frag" | "flashbang" | "smoke";
export type BattleFireMode = "primary" | "throw";

export const LEASE_TIMEOUT_MS = 15_000;
/** A backgrounded/locked client keeps its player slot for 90 seconds. */
export const RECONNECT_GRACE_MS = 90_000;

export type BattleEffect = {
  id: string;
  kind: BattleEffectKind;
  expiresAt: number;
};

export type BattlePlayer = {
  id: string;
  name: string;
  markerId: number;
  markerColor: string;
  lives: number;
  hp: number;
  alive: boolean;
  respawnAt: number;
  isHost: boolean;
  connected: boolean;
};

export type BattleRoom = {
  code: string;
  status: RoomStatus;
  winnerPlayerId: string | null;
  draw: boolean;
  players: BattlePlayer[];
  effects: BattleEffect[];
  maxPlayers: number;
  updatedAt: number;
};

export type StoredSession = {
  tokenHash: string;
  code: string;
  playerId: string;
  lastSeenAt: number;
  disconnectedAt: number | null;
  nextShotAt: number;
};

type StoredNetworkShotOutcome = {
  shotId: string;
  shooterId: string;
  targetId: string;
  accepted: boolean;
  reason: string;
  damage: number;
  eliminated: boolean;
};

type StoredPendingShotIntent = {
  shotId: string;
  shooterId: string;
  targetId: string;
  weaponId: string;
  fireMode: BattleFireMode;
  firedAt: number;
  createdAt: number;
};
type StoredEntryRequest = {
  requestId: string;
  kind: "create" | "join";
  playerId: string;
  createdAt: number;
};

export type StoredBattleRoom = Omit<BattleRoom, "effects"> & {
  effects: StoredBattleEffect[];
  startedPlayerIds: string[];
  sessions: StoredSession[];
  /** Bounded, durable idempotency records for socket shot intents. */
  networkShotOutcomes: StoredNetworkShotOutcome[];
  pendingShotIntents: StoredPendingShotIntent[];
  /** Durable identity for create/join retries; bearer tokens remain hash-only. */
  entryRequests: StoredEntryRequest[];
};

export interface BattlePersistence {
  load(): Promise<StoredBattleRoom[]>;
  save(room: StoredBattleRoom): Promise<void>;
  remove(code: string): Promise<void>;
  /**
   * Every battle mutation executes inside one database transaction while
   * holding this lock.  The callback must reload authoritative state before it
   * reads or changes the in-memory working copy.
   */
  withLock<T>(scope: string, callback: (transaction: BattlePersistence) => Promise<T>): Promise<T>;
}

type StoredBattleEffect = BattleEffect & { targetId: string };
type WeaponSpec = {
  interval: number;
  damage: number;
  action: "firearm" | "grenade" | "melee";
  effect?: BattleEffectKind;
};

/*
 * This list mirrors the selectable client catalog. Damage is deliberately
 * server-owned: the client can report what it aimed at, but cannot choose
 * damage or bypass a weapon's cooldown. Heavy machine guns are a one-hit
 * game mechanic, balanced by their long server cooldown; fast/light weapons
 * create wounds that require follow-up hits.
 */
const WEAPONS: Record<string, WeaponSpec> = {
  "glock-17": { interval: 245, damage: 22, action: "firearm" },
  "desert-eagle": { interval: 420, damage: 55, action: "firearm" },
  mp5: { interval: 90, damage: 14, action: "firearm" },
  p90: { interval: 78, damage: 12, action: "firearm" },
  m4a1: { interval: 95, damage: 18, action: "firearm" },
  "ak-47": { interval: 110, damage: 23, action: "firearm" },
  hk416: { interval: 88, damage: 18, action: "firearm" },
  g3: { interval: 105, damage: 30, action: "firearm" },
  m16a4: { interval: 110, damage: 18, action: "firearm" },
  akm: { interval: 108, damage: 24, action: "firearm" },
  "scar-l": { interval: 96, damage: 18, action: "firearm" },
  g36c: { interval: 92, damage: 17, action: "firearm" },
  famas: { interval: 82, damage: 16, action: "firearm" },
  "aug-a3": { interval: 90, damage: 18, action: "firearm" },
  uzi: { interval: 86, damage: 13, action: "firearm" },
  "remington-870": { interval: 780, damage: 48, action: "firearm" },
  "benelli-m4": { interval: 420, damage: 42, action: "firearm" },
  awp: { interval: 1200, damage: 88, action: "firearm" },
  "barrett-m82": { interval: 900, damage: 92, action: "firearm" },
  "dragunov-svd": { interval: 520, damage: 64, action: "firearm" },
  m249: { interval: 1100, damage: 100, action: "firearm" },
  "mg42": { interval: 1000, damage: 100, action: "firearm" },
  mg3: { interval: 980, damage: 100, action: "firearm" },
  pkm: { interval: 1150, damage: 100, action: "firearm" },
  "minigun-m134": { interval: 900, damage: 100, action: "firearm" },
  "frag-grenade": { interval: 1300, damage: 62, action: "grenade", effect: "frag" },
  flashbang: { interval: 1300, damage: 0, action: "grenade", effect: "flashbang" },
  "smoke-grenade": { interval: 1600, damage: 0, action: "grenade", effect: "smoke" },
  bazooka: { interval: 1400, damage: 78, action: "firearm" },
  "rpg-7": { interval: 1500, damage: 82, action: "firearm" },
  at4: { interval: 1650, damage: 86, action: "firearm" },
  "laser-rifle": { interval: 190, damage: 20, action: "firearm" },
  "electric-arc": { interval: 720, damage: 36, action: "firearm" },
  slingshot: { interval: 760, damage: 28, action: "firearm" },
  knife: { interval: 520, damage: 40, action: "melee" },
};

const MAX_HP = 100;
const STARTING_LIVES = 5;
const MARKERS = ["#FF2D55", "#00E5FF", "#FFD60A", "#7CFF6B", "#BF5AF2", "#FF9F0A", "#64D2FF", "#FF375F", "#30D158", "#AC8E68"];

/**
 * A session remains recoverable while its authenticated requests keep this
 * deadline alive.  Keep this exported so clients and time-controlled tests
 * can use the same contract as the store.
 */
/** Deadline after the last authenticated presence before permanent removal. */
export const PLAYER_TIMEOUT_MS = RECONNECT_GRACE_MS;
const EFFECT_DURATION: Record<BattleEffectKind, number> = {
  frag: 1200,
  flashbang: 2500,
  smoke: 6000,
};

const rooms = new Map<string, StoredBattleRoom>();
const sessions = new Map<string, StoredSession>();
type BattleEntrySession = { playerId: string; sessionToken: string; room: BattleRoom };
const MAX_ENTRY_REQUESTS = 64;
const ENTRY_RETRY_WINDOW_MS = 15_000;
const MAX_NETWORK_SHOT_OUTCOMES = 256;

const SHOT_OBSERVATION_WINDOW_MS = 2200;
const EXPIRED_SESSION_RETENTION_MS = PLAYER_TIMEOUT_MS;
function id() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function roomCode() {
  let code = "";
  do code = randomBytes(3).toString("hex").toUpperCase(); while (rooms.has(code));
  return code;
}

function sessionToken() {
  return randomBytes(32).toString("base64url");
}

function clearExpirySweep() {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = undefined;
}
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The production persistence adapter uses the project's existing PostgreSQL
 * database.  Tokens are persisted only as SHA-256 hashes; a database snapshot
 * never contains a bearer credential that can be replayed.
 */
export class PostgresBattlePersistence implements BattlePersistence {
  async load() {
    const { db, battleRoomsTable } = await import("@workspace/db") as unknown as {
      db: PostgresExecutor;
      battleRoomsTable: any;
    };
    return loadPostgresRooms(db, battleRoomsTable);
  }

  async save(room: StoredBattleRoom) {
    const { db, battleRoomsTable } = await import("@workspace/db") as unknown as {
      db: PostgresExecutor;
      battleRoomsTable: any;
    };
    await savePostgresRoom(db, battleRoomsTable, room);
  }

  async remove(code: string) {
    const { db, battleRoomsTable } = await import("@workspace/db") as unknown as {
      db: PostgresExecutor;
      battleRoomsTable: any;
    };
    await removePostgresRoom(db, battleRoomsTable, code);
  }

  async withLock<T>(scope: string, callback: (transaction: BattlePersistence) => Promise<T>): Promise<T> {
    const { db } = await import("@workspace/db");
    return db.transaction(async (transaction) => {
      // A single global lock is intentional: create/join/leave and room
      // sweeps all reload the complete snapshot, so no process can overwrite
      // a room from a stale in-memory copy. The xact lock is released by PG on
      // commit or rollback, including when the callback throws.
      await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${scope}, 0))`);
      return callback(new PostgresBattleTransactionPersistence(transaction));
    });
  }
}

type PostgresExecutor = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  delete: (...args: any[]) => any;
};

async function loadPostgresRooms(executor: PostgresExecutor, battleRoomsTable: any) {
  const rows = await executor.select().from(battleRoomsTable);
  return rows.map((row: { code: string; state: unknown }) => {
    if (!row.state || typeof row.state !== "object") {
      throw new Error(`BATTLE_STATE_CORRUPT:${row.code}`);
    }
    const state = row.state as StoredBattleRoom;
    if (state.code !== row.code || !Array.isArray(state.players) || !Array.isArray(state.sessions)) {
      throw new Error(`BATTLE_STATE_CORRUPT:${row.code}`);
    }
    return state;
  });
}

async function savePostgresRoom(executor: PostgresExecutor, battleRoomsTable: any, room: StoredBattleRoom) {
  await executor
    .insert(battleRoomsTable)
    .values({ code: room.code, state: room, updatedAt: room.updatedAt })
    .onConflictDoUpdate({
      target: battleRoomsTable.code,
      set: { state: room, updatedAt: room.updatedAt },
    });
}

async function removePostgresRoom(executor: PostgresExecutor, battleRoomsTable: any, code: string) {
  await executor.delete(battleRoomsTable).where(eq(battleRoomsTable.code, code));
}

class PostgresBattleTransactionPersistence implements BattlePersistence {
  constructor(private readonly transaction: PostgresExecutor) {}

  async load() {
    const { battleRoomsTable } = await import("@workspace/db") as unknown as { battleRoomsTable: any };
    return loadPostgresRooms(this.transaction, battleRoomsTable);
  }

  async save(room: StoredBattleRoom) {
    const { battleRoomsTable } = await import("@workspace/db") as unknown as { battleRoomsTable: any };
    await savePostgresRoom(this.transaction, battleRoomsTable, room);
  }

  async remove(code: string) {
    const { battleRoomsTable } = await import("@workspace/db") as unknown as { battleRoomsTable: any };
    await removePostgresRoom(this.transaction, battleRoomsTable, code);
  }

  async withLock<T>(_scope: string, callback: (transaction: BattlePersistence) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

/**
 * A deterministic adapter used by the server regression tests.  It models the
 * same restart boundary as PostgreSQL while keeping tests isolated and fast.
 */
export class InMemoryBattlePersistence implements BattlePersistence {
  private readonly snapshots = new Map<string, StoredBattleRoom>();
  private lock = Promise.resolve();

  clear() {
    this.snapshots.clear();
  }

  async load() {
    return [...this.snapshots.values()].map((room) => clone(room));
  }

  async save(room: StoredBattleRoom) {
    this.snapshots.set(room.code, clone(room));
  }

  async remove(code: string) {
    this.snapshots.delete(code);
  }

  async withLock<T>(_scope: string, callback: (transaction: BattlePersistence) => Promise<T>): Promise<T> {
    const operation: Promise<T> = this.lock.then(async () => {
      const before = new Map([...this.snapshots].map(([code, room]) => [code, clone(room)]));
      try {
        return await callback(this);
      } catch (error) {
        this.snapshots.clear();
        for (const [code, room] of before) this.snapshots.set(code, room);
        throw error;
      }
    });
    // A failed operation must not poison the queue for subsequent operations.
    this.lock = operation.then(() => undefined, () => undefined);
    return operation;
  }
}

let persistence: BattlePersistence = new PostgresBattlePersistence();
let clock = () => Date.now();
let loaded = false;
let loading: Promise<void> | null = null;
let activePersistence: BattlePersistence | null = null;
const BATTLE_STORE_LOCK_SCOPE = "battle-store";

/**
 * Test-only configuration also gives deterministic tests control over time.
 * Production never calls this function; the default remains PostgreSQL.
 */
export function configureBattleStore(options: {
  persistence?: BattlePersistence;
  now?: () => number;
} = {}) {
  persistence = options.persistence ?? new PostgresBattlePersistence();
  clock = options.now ?? (() => Date.now());
  rooms.clear();
  sessions.clear();
  expiredSessions.clear();
  clearExpirySweep();
  loaded = false;
  loading = null;
  activePersistence = null;
}

export async function initializeBattleStore() {
  await withStoreOperation(async () => undefined);
}

/**
 * Simulates a process replacement in tests.  The next operation hydrates from
 * the configured durable adapter and therefore exercises the restart path.
 */
export async function resetBattleStoreForTests() {
  rooms.clear();
  sessions.clear();
  expiredSessions.clear();
  clearExpirySweep();
  loaded = false;
  loading = null;
  activePersistence = null;
}

async function ensureLoaded() {
  if (loaded) return;
  if (!loading) {
    const source = activePersistence ?? persistence;
    loading = source.load().then((snapshots) => {
      rooms.clear();
      sessions.clear();
      for (const snapshot of snapshots) hydrate(snapshot);
      loaded = true;
    }).finally(() => {
      loading = null;
    });
  }
  await loading;
}

async function withStoreOperation<T>(operation: () => Promise<T>) {
  try {
    const result = await persistence.withLock(BATTLE_STORE_LOCK_SCOPE, async (transaction) => {
      const previousPersistence = activePersistence;
      activePersistence = transaction;
      loaded = false;
      loading = null;
      try {
        // Reload after acquiring the lock. This is the authoritative snapshot
        // for this operation, not a process-local cache from an earlier request.
        await ensureLoaded();
        return await operation();
      } catch (error) {
        // A failed transaction must never leave an in-memory state that was not
        // committed. The next request will reload from durable storage.
        rooms.clear();
        sessions.clear();
        loaded = false;
        loading = null;
        throw error;
      } finally {
        activePersistence = previousPersistence;
      }
    });
    scheduleExpirySweep();
    return result;
  } catch (error) {
    // Transaction commit/connection failures happen after the callback has
    // returned. Treat them exactly like callback failures so a ghost state
    // cannot be served by the next request.
    rooms.clear();
    sessions.clear();
    loaded = false;
    loading = null;
    throw error;
  }
}

function hydrate(snapshot: StoredBattleRoom) {
  const room = clone(snapshot);
  room.winnerPlayerId ??= null;
  room.startedPlayerIds ??= room.status === "lobby" ? [] : room.players.map((player) => player.id);
  room.networkShotOutcomes ??= [];
  room.pendingShotIntents ??= [];
  room.entryRequests ??= [];
  rooms.set(room.code, room);
  for (const storedSession of room.sessions) {
    const player = room.players.find((entry) => entry.id === storedSession.playerId);
    if (!player) {
      const tombstoneExpiresAt = storedSession.lastSeenAt + PLAYER_TIMEOUT_MS + EXPIRED_SESSION_RETENTION_MS;
      if (tombstoneExpiresAt > clock()) expiredSessions.set(storedSession.tokenHash, tombstoneExpiresAt);
      sessions.set(storedSession.tokenHash, { ...storedSession, disconnectedAt: storedSession.disconnectedAt ?? storedSession.lastSeenAt + PLAYER_TIMEOUT_MS });
      continue;
    }
    const disconnectBoundary = storedSession.lastSeenAt + LEASE_TIMEOUT_MS;
    const disconnectedAt = clock() > disconnectBoundary ? disconnectBoundary : null;
    const session = {
      ...storedSession,
      disconnectedAt,
      nextShotAt: storedSession.nextShotAt ?? 0,
    };
    // A restarted instance must not disconnect healthy clients. The durable
    // heartbeat timestamp is the source of truth, not the old in-memory flag.
    player.connected = disconnectedAt === null;
    sessions.set(session.tokenHash, session);
  }
}

function snapshot(room: StoredBattleRoom) {
  room.sessions = [...sessions.values()]
    .filter((session) => session.code === room.code)
    .map((session) => ({ ...session }));
  return clone(room);
}

function persistRoom(room: StoredBattleRoom) {
  const next = snapshot(room);
  return (activePersistence ?? persistence).save(next);
}

function removePersistedRoom(code: string) {
  return (activePersistence ?? persistence).remove(code);
}

function finishIfComplete(room: StoredBattleRoom) {
  // Never recalculate a winner after the terminal transition. This is what
  // keeps the result stable when the winner disconnects after the match ends.
  if (room.status !== "active" || room.startedPlayerIds.length < 2) return false;
  const startedPlayers = new Set(room.startedPlayerIds);
  const livingPlayers = room.players.filter((player) => startedPlayers.has(player.id) && player.lives > 0);
  if (livingPlayers.length > 1) return false;
  const winnerPlayerId = livingPlayers[0]?.id ?? null;
  room.status = "finished";
  room.winnerPlayerId = winnerPlayerId;
  room.draw = winnerPlayerId === null;
  return true;
}

function transferHost(room: StoredBattleRoom) {
  if (room.players.some((entry) => entry.isHost)) return false;
  const nextHost = room.players[0];
  if (!nextHost) return false;
  nextHost.isHost = true;
  return true;
}

function removePlayer(room: StoredBattleRoom, playerId: string) {
  const before = room.players.length;
  room.players = room.players.filter((entry) => entry.id !== playerId);
  for (const [tokenHash, session] of sessions) {
    if (session.code === room.code && session.playerId === playerId) sessions.delete(tokenHash);
  }
  room.effects = room.effects.filter((effect) => effect.targetId !== playerId);
  const hostTransferred = transferHost(room);
  return before !== room.players.length || hostTransferred;
}

function refresh(room: StoredBattleRoom, now = clock()) {
  let changed = false;
  for (const player of room.players) {
    if (!player.alive && player.lives > 0 && player.respawnAt > 0 && player.respawnAt <= now) {
      player.alive = true;
      player.hp = MAX_HP;
      player.respawnAt = 0;
      changed = true;
    }
  }

  const activeEffects = room.effects.filter((effect) => effect.expiresAt > now);
  if (activeEffects.length !== room.effects.length) changed = true;
  room.effects = activeEffects;

  // A missed heartbeat first marks a player disconnected.  The player and
  // marker remain reserved during the grace window, allowing a brief OS or
  // network interruption to reconnect without changing the match.
  for (const session of [...sessions.values()]) {
    if (session.code !== room.code) continue;
    const player = room.players.find((entry) => entry.id === session.playerId);
    if (!player) {
      continue;
    }
    const disconnectBoundary = session.lastSeenAt + LEASE_TIMEOUT_MS;
    if (!session.disconnectedAt && now > disconnectBoundary) {
      session.disconnectedAt = disconnectBoundary;
      player.connected = false;
      changed = true;
    }
  }

  changed = finishIfComplete(room) || changed;
  if (changed) touchRoom(room, now);
  return changed;
}

function touchRoom(room: StoredBattleRoom, at = clock()) {
  room.updatedAt = Math.max(room.updatedAt + 1, at);
}

function publicRoom(room: StoredBattleRoom, viewerId: string): BattleRoom {
  return {
    code: room.code,
    status: room.status,
    winnerPlayerId: room.winnerPlayerId,
    draw: room.draw,
    players: room.players.map((player) => ({ ...player })),
    effects: room.effects
      .filter((effect) => effect.targetId === viewerId)
      .map(({ targetId: _targetId, ...effect }) => effect),
    maxPlayers: room.maxPlayers,
    updatedAt: room.updatedAt,
  };
}

/**
 * Remove players in deadline cohorts. Players with the same deadline are
 * removed together, then the room is evaluated before the next deadline
 * cohort is processed. This keeps a delayed sweep equivalent to the timer
 * firing at each deadline instead of making the final winner depend on when
 * the sweep happened to run.
 */
export function sweepExpiredPlayers(now = clock()) {
  return withStoreOperation(() => sweepExpiredPlayersUnlocked(now));
}
function player(name: string, markerId: number, isHost: boolean): BattlePlayer {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("INVALID_NAME");
  return {
    id: id(),
    name: normalizedName,
    markerId,
    markerColor: MARKERS[markerId],
    lives: STARTING_LIVES,
    hp: MAX_HP,
    alive: true,
    respawnAt: 0,
    isHost,
    connected: true,
  };
}

/**
 * A finished room is retained so its result can be observed and persisted.
 * The next join starts a new round in that same room rather than allocating a
 * second room or exposing the terminal state to the rematch.
 */
function resetFinishedRoomForRematch(room: StoredBattleRoom) {
  room.status = "active";
  room.winnerPlayerId = null;
  room.draw = false;
  room.effects = [];
  room.networkShotOutcomes = [];
  room.pendingShotIntents = [];
  for (const retainedPlayer of room.players) {
    retainedPlayer.lives = STARTING_LIVES;
    retainedPlayer.hp = MAX_HP;
    retainedPlayer.alive = true;
    retainedPlayer.respawnAt = 0;
  }
}

function addSession(room: StoredBattleRoom, playerId: string) {
  const token = sessionToken();
  const tokenHash = hashToken(token);
  const session: StoredSession = {
    tokenHash,
    code: room.code,
    playerId,
    lastSeenAt: clock(),
    disconnectedAt: null,
    nextShotAt: 0,
  };
  sessions.set(tokenHash, session);
  room.sessions.push(session);
  return { token, tokenHash };
}

type AuthorizedRoom = {
  playerId: string;
  tokenHash: string;
  session: StoredSession;
  room: StoredBattleRoom;
};

async function authorizedRoom(
  code: string,
  token: string,
  options: { persistRefresh?: boolean } = {},
): Promise<AuthorizedRoom> {
  await ensureLoaded();
  await sweepExpiredPlayersUnlocked(clock());
  const tokenHash = hashToken(token);
  const tombstoneExpiresAt = expiredSessions.get(tokenHash);
  if (tombstoneExpiresAt !== undefined) {
    if (tombstoneExpiresAt > clock()) throw new Error("SESSION_EXPIRED");
    expiredSessions.delete(tokenHash);
  }
  const normalizedCode = code.toUpperCase();
  const room = rooms.get(normalizedCode);
  if (!room || room.players.length === 0) throw new Error("ROOM_NOT_FOUND");
  const session = sessions.get(tokenHash);
  if (!session || session.code !== room.code || !room.players.some((entry) => entry.id === session.playerId)) {
    throw new Error("UNAUTHORIZED");
  }
  const changed = refresh(room);
  if (changed && options.persistRefresh !== false) await persistRoom(room);
  return { playerId: session.playerId, tokenHash, session, room };
}

function renewPresence(authorized: {
  playerId: string;
  session: StoredSession;
  room: StoredBattleRoom;
}) {
  const now = clock();
  const player = authorized.room.players.find((entry) => entry.id === authorized.playerId);
  if (!player) throw new Error("UNAUTHORIZED");
  authorized.session.lastSeenAt = now;
  authorized.session.disconnectedAt = null;
  if (!player.connected) touchRoom(authorized.room, now);
  player.connected = true;
}
function validEntryRequestId(requestId: string | undefined) {
  return requestId && requestId.length >= 16 ? requestId : undefined;
}

async function replayEntryRequest(
  kind: StoredEntryRequest["kind"],
  requestId: string | undefined,
  code?: string,
): Promise<BattleEntrySession | undefined> {
  if (!requestId) return undefined;
  const now = clock();
  await sweepExpiredPlayersUnlocked(now);
  const expectedCode = code?.toUpperCase();
  for (const room of rooms.values()) {
    if (expectedCode && room.code !== expectedCode) continue;
    const record = room.entryRequests.find((entry) => entry.kind === kind && entry.requestId === requestId);
    if (!record) continue;
    if (record.createdAt + ENTRY_RETRY_WINDOW_MS < now) continue;
    const existingPlayer = room.players.find((entry) => entry.id === record.playerId);
    if (!existingPlayer) continue;
    const existingSession = [...sessions.values()].find(
      (entry) => entry.code === room.code && entry.playerId === record.playerId,
    );
    if (!existingSession || existingSession.lastSeenAt + PLAYER_TIMEOUT_MS < now) continue;

    // A retry may land on a different process after the first response was
    // lost. Rotate the bearer token instead of persisting a replayable token.
    for (const [tokenHash, storedSession] of sessions) {
      if (storedSession.code === room.code && storedSession.playerId === record.playerId) {
        sessions.delete(tokenHash);
      }
    }
    const session = addSession(room, record.playerId);
    touchRoom(room, now);
    await persistRoom(room);
    return {
      playerId: record.playerId,
      sessionToken: session.token,
      room: publicRoom(room, record.playerId),
    };
  }
  return undefined;
}

function rememberEntryRequest(
  room: StoredBattleRoom,
  kind: StoredEntryRequest["kind"],
  requestId: string | undefined,
  playerId: string,
) {
  if (!requestId) return;
  room.entryRequests.push({ requestId, kind, playerId, createdAt: clock() });
  if (room.entryRequests.length > MAX_ENTRY_REQUESTS) {
    room.entryRequests.splice(0, room.entryRequests.length - MAX_ENTRY_REQUESTS);
  }
}

export function createRoom(name: string, requestId?: string) {
  return withStoreOperation(() => createRoomUnlocked(name, requestId));
}

async function createRoomUnlocked(name: string, requestId?: string) {
  await ensureLoaded();
  const normalizedRequestId = validEntryRequestId(requestId);
  const replayed = await replayEntryRequest("create", normalizedRequestId);
  if (replayed) return replayed;
  const host = player(name, 0, true);
  const room: StoredBattleRoom = {
    code: roomCode(),
    status: "active",
    winnerPlayerId: null,
    draw: false,
    players: [host],
    effects: [],
    maxPlayers: MARKERS.length,
    updatedAt: clock(),
    startedPlayerIds: [host.id],
    sessions: [],
    networkShotOutcomes: [],
    pendingShotIntents: [],
    entryRequests: [],
  };
  rooms.set(room.code, room);
  const session = addSession(room, host.id);
  rememberEntryRequest(room, "create", normalizedRequestId, host.id);
  await persistRoom(room);
  return {
    playerId: host.id,
    sessionToken: session.token,
    room: publicRoom(room, host.id),
  };
}

export function joinRoom(code: string, name: string, requestId?: string, token?: string) {
  return withStoreOperation(() => joinRoomUnlocked(code, name, requestId, token));
}

async function joinRoomUnlocked(code: string, name: string, requestId?: string, token?: string) {
  await ensureLoaded();
  const normalizedCode = code.toUpperCase();
  const normalizedRequestId = validEntryRequestId(requestId);
  const replayed = await replayEntryRequest("join", normalizedRequestId, normalizedCode);
  if (replayed) return replayed;
  // Joining must also process overdue durable leases, so disconnected players
  // cannot consume markers or the room capacity until another state request.
  await sweepExpiredPlayersUnlocked(clock());
  const room = rooms.get(normalizedCode);
  if (!room || room.players.length === 0) throw new Error("ROOM_NOT_FOUND");
  if (refresh(room)) await persistRoom(room);
  if (!rooms.has(room.code)) {
    await removePersistedRoom(room.code);
    throw new Error("ROOM_NOT_FOUND");
  }
  const wasFinished = room.status === "finished";
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("INVALID_NAME");
  let authenticatedPlayerId: string | undefined;
  if (token) {
    const tokenHash = hashToken(token);
    const storedSession = sessions.get(tokenHash);
    if (!storedSession || storedSession.code !== room.code) throw new Error("UNAUTHORIZED");
    const authenticatedPlayer = room.players.find((entry) => entry.id === storedSession.playerId);
    if (!authenticatedPlayer || authenticatedPlayer.name !== normalizedName) throw new Error("UNAUTHORIZED");
    authenticatedPlayerId = authenticatedPlayer.id;
  }
  if (wasFinished && !authenticatedPlayerId) throw new Error("UNAUTHORIZED");

  if (wasFinished) resetFinishedRoomForRematch(room);

  // A rematching player keeps their durable identity/marker, but receives a
  // newly rotated bearer session so the old round cannot remain authenticated.
  let joined = authenticatedPlayerId
    ? room.players.find((entry) => entry.id === authenticatedPlayerId)
    : undefined;
  if (joined) {
    for (const [tokenHash, storedSession] of sessions) {
      if (storedSession.code === room.code && storedSession.playerId === joined.id) {
        sessions.delete(tokenHash);
      }
    }
    room.sessions = room.sessions.filter(
      (storedSession) => !(storedSession.code === room.code && storedSession.playerId === joined!.id),
    );
    joined.connected = true;
  } else {
    if (room.players.length >= room.maxPlayers) throw new Error("ROOM_FULL");
    const occupiedMarkers = new Set(room.players.map((entry) => entry.markerId));
    const markerId = MARKERS.findIndex((_marker, index) => !occupiedMarkers.has(index));
    if (markerId < 0) throw new Error("ROOM_FULL");
    joined = player(normalizedName, markerId, false);
    room.players.push(joined);
  }
  room.startedPlayerIds = room.players.map((entry) => entry.id);
  touchRoom(room);
  const session = addSession(room, joined.id);
  rememberEntryRequest(room, "join", normalizedRequestId, joined.id);
  await persistRoom(room);
  return {
    playerId: joined.id,
    sessionToken: session.token,
    room: publicRoom(room, joined.id),
  };
}

export function getRoom(code: string, token: string) {
  return withStoreOperation(() => getRoomUnlocked(code, token));
}

/**
 * Socket handshakes use the same hashed bearer session lookup as REST. This
 * function deliberately returns no credential and is only used before a
 * socket is allowed to join the room namespace.
 */
export function authenticateBattleSession(code: string, token: string) {
  return withStoreOperation(async () => {
    const authorized = await authorizedRoom(code, token);
    renewPresence(authorized);
    await persistRoom(authorized.room);
    return { roomCode: authorized.room.code, playerId: authorized.playerId };
  });
}

/**
 * Returns the viewer-filtered room snapshot without renewing presence. Socket
 * fan-out uses this after a combat mutation so an opponent's targeted effects
 * are never disclosed to other players and a state push cannot keep an idle
 * lease alive.
 */
export function getPublicBattleSnapshot(code: string, token: string) {
  return withStoreOperation(async () => {
    // Persist disconnect/expiry transitions, but never call renewPresence.
    const authorized = await authorizedRoom(code, token);
    return {
      playerId: authorized.playerId,
      room: publicRoom(authorized.room, authorized.playerId),
    };
  });
}

async function getRoomUnlocked(code: string, token: string) {
  const session = await authorizedRoom(code, token);
  // State polling is an authenticated heartbeat. Renew only after the sweep
  // has established that this credential has not already expired.
  renewPresence(session);
  await persistRoom(session.room);
  return { playerId: session.playerId, sessionToken: token, room: publicRoom(session.room, session.playerId) };
}

export function heartbeatRoom(code: string, token: string) {
  return withStoreOperation(() => heartbeatRoomUnlocked(code, token));
}

async function heartbeatRoomUnlocked(code: string, token: string) {
  const authorized = await authorizedRoom(code, token);
  renewPresence(authorized);
  await persistRoom(authorized.room);
  return {
    playerId: authorized.playerId,
    sessionToken: token,
    room: publicRoom(authorized.room, authorized.playerId),
  };
}

export function startRoom(code: string, token: string) {
  return withStoreOperation(() => startRoomUnlocked(code, token));
}

async function startRoomUnlocked(code: string, token: string) {
  const session = await authorizedRoom(code, token);
  const actor = session.room.players.find((entry) => entry.id === session.playerId);
  if (!actor?.isHost) throw new Error("HOST_ONLY");
  if (session.room.status !== "lobby") throw new Error("ROOM_STARTED");
  session.room.startedPlayerIds = session.room.players.map((entry) => entry.id);
  session.room.status = "active";
  touchRoom(session.room);
  renewPresence(session);
  await persistRoom(session.room);
  return {
    playerId: session.playerId,
    sessionToken: token,
    room: publicRoom(session.room, session.playerId),
  };
}

/**
 * Leave is an explicit session operation rather than a caller-supplied player
 * id. Removing the player also invalidates their token and cooldown, transfers
 * host ownership when necessary, and lets refresh finish a contested match
 * when only one started player remains.
 */
export function leaveRoom(code: string, token: string) {
  return withStoreOperation(() => leaveRoomUnlocked(code, token));
}

async function leaveRoomUnlocked(code: string, token: string) {
  const session = await authorizedRoom(code, token);
  const room = session.room;
  const leavingPlayerId = session.playerId;
  const leavingPlayer = room.players.find((entry) => entry.id === leavingPlayerId);
  sessions.delete(session.tokenHash);
  room.sessions = room.sessions.filter((entry) => entry.tokenHash !== session.tokenHash);
  removePlayer(room, leavingPlayerId);

  if (room.players.length === 0) {
    rooms.delete(room.code);
    await removePersistedRoom(room.code);
    return;
  }

  finishIfComplete(room);
  touchRoom(room);
  await persistRoom(room);
}

export type FireShotResult = {
  accepted: boolean;
  reason: string;
  shooterId: string;
  targetId: string;
  damage: number;
  eliminated: boolean;
  room: BattleRoom;
};
export type NetworkFireShotResult = FireShotResult & { duplicate: boolean };

function storedNetworkOutcome(
  shotId: string,
  result: FireShotResult,
): StoredNetworkShotOutcome {
  return {
    shotId,
    shooterId: result.shooterId,
    targetId: result.targetId,
    accepted: result.accepted,
    reason: result.reason,
    damage: result.damage,
    eliminated: result.eliminated,
  };
}

function publicNetworkOutcome(
  stored: StoredNetworkShotOutcome,
  room: StoredBattleRoom,
): NetworkFireShotResult {
  return {
    ...stored,
    duplicate: true,
    room: publicRoom(room, stored.shooterId),
  };
}

export function fireShot(
  code: string,
  token: string,
  markerId: number,
  firedAt: number,
  weaponId = "m4a1",
  fireMode: BattleFireMode = "primary",
) : Promise<FireShotResult> {
  return withStoreOperation(() => fireShotUnlocked(code, token, markerId, firedAt, weaponId, fireMode));
}

/**
 * Network Hit Test entry point. Target identity is resolved to the server's
 * marker inside the existing transaction, then the existing authoritative
 * fireShot mutation performs every combat validation and damage change.
 */
export function fireShotByPlayerId(
  code: string,
  token: string,
  shotId: string,
  targetPlayerId: string,
  firedAt: number,
  weaponId = "m4a1",
  fireMode: BattleFireMode = "primary",
) {
  return withStoreOperation(async () => {
    const authorized = await authorizedRoom(code, token, { persistRefresh: false });
    const previous = authorized.room.networkShotOutcomes.find(
      (entry) => entry.shooterId === authorized.playerId && entry.shotId === shotId,
    );
    if (previous) return publicNetworkOutcome(previous, authorized.room);

    const target = authorized.room.players.find((entry) => entry.id === targetPlayerId);
    const result = await fireShotUnlocked(
      code,
      token,
      target?.markerId ?? -1,
      firedAt,
      weaponId,
      fireMode,
      { authorized, persist: false },
    );
    const networkResult = { ...result, duplicate: false };
    authorized.room.networkShotOutcomes = [
      ...authorized.room.networkShotOutcomes,
      storedNetworkOutcome(shotId, result),
    ].slice(-MAX_NETWORK_SHOT_OUTCOMES);
    // The combat mutation and its idempotency record are committed together.
    await persistRoom(authorized.room);
    return networkResult;
  });
}

export function registerShotIntent(
  code: string,
  token: string,
  shotId: string,
  targetPlayerId: string,
  firedAt: number,
  weaponId: string,
  fireMode: BattleFireMode,
) {
  return withStoreOperation(async () => {
    const authorized = await authorizedRoom(code, token, { persistRefresh: false });
    const room = authorized.room;
    const previous = room.networkShotOutcomes.find(
      (entry) => entry.shooterId === authorized.playerId && entry.shotId === shotId,
    );
    if (previous) return { ...publicNetworkOutcome(previous, room), pending: false };
    const existing = room.pendingShotIntents.find(
      (entry) => entry.shooterId === authorized.playerId && entry.shotId === shotId,
    );
    if (existing) return {
      accepted: true,
      pending: true,
      reason: "AWAITING_OBSERVATION",
      shooterId: authorized.playerId,
      targetId: existing.targetId,
      damage: 0,
      eliminated: false,
      room: publicRoom(room, authorized.playerId),
      duplicate: true,
      shotId,
    };
    const now = clock();
    const target = room.players.find((entry) => entry.id === targetPlayerId);
    if (!target || target.id === authorized.playerId || !target.alive) {
      return { accepted: false, pending: false, shotId, reason: "INVALID_TARGET", shooterId: authorized.playerId, targetId: "", damage: 0, eliminated: false, room: publicRoom(room, authorized.playerId), duplicate: false };
    }
    if (!WEAPONS[weaponId] || (fireMode !== "primary" && fireMode !== "throw")) {
      return { accepted: false, pending: false, shotId, reason: "INVALID_SHOT_INTENT", shooterId: authorized.playerId, targetId: targetPlayerId, damage: 0, eliminated: false, room: publicRoom(room, authorized.playerId), duplicate: false };
    }
    if (!Number.isFinite(firedAt) || Math.abs(now - firedAt) > 5000) {
      return { accepted: false, pending: false, shotId, reason: "SHOT_TIMEOUT", shooterId: authorized.playerId, targetId: targetPlayerId, damage: 0, eliminated: false, room: publicRoom(room, authorized.playerId), duplicate: false };
    }
    room.pendingShotIntents = room.pendingShotIntents
      .filter((entry) => now - entry.createdAt <= SHOT_OBSERVATION_WINDOW_MS)
      .concat({
        shotId,
        shooterId: authorized.playerId,
        targetId: targetPlayerId,
        weaponId,
        fireMode,
        firedAt,
        createdAt: now,
      })
      .slice(-64);
    renewPresence(authorized);
    await persistRoom(room);
    return {
      accepted: true,
      pending: true,
      reason: "AWAITING_OBSERVATION",
      shooterId: authorized.playerId,
      targetId: targetPlayerId,
      damage: 0,
      eliminated: false,
      room: publicRoom(room, authorized.playerId),
      duplicate: false,
      shotId,
    };
  });
}
async function fireShotUnlocked(
  code: string,
  token: string,
  markerId: number,
  firedAt: number,
  weaponId = "m4a1",
  fireMode: BattleFireMode = "primary",
  options: { authorized?: AuthorizedRoom; persist?: boolean } = {},
) {
  // Weapon IDs are validated against the server catalog, but this local
  // prototype has no server-backed paid entitlement or ammo ledger. Do not
  // treat a client-selected Pro ID as proof of purchase; wire the real
  // entitlement service before enforcing monetized unlocks in ranked play.
  const session = options.authorized ?? await authorizedRoom(code, token);
  renewPresence(session);
  const room = session.room;
  const playerId = session.playerId;
  const shooter = room.players.find((entry) => entry.id === playerId);
  const target = Number.isInteger(markerId) && markerId >= 0 && markerId < MARKERS.length
    ? room.players.find((entry) => entry.markerId === markerId)
    : undefined;
  const weapon = WEAPONS[weaponId];
  let reason = "Vuruş doğrulandı";
  let accepted = true;
  let damage = 0;
  let eliminated = false;
  const now = clock();

  if (!weapon) { accepted = false; reason = "Geçersiz silah"; }
  else if (fireMode !== "primary" && fireMode !== "throw") { accepted = false; reason = "Geçersiz atış türü"; }
  else if (room.status !== "active") { accepted = false; reason = "Savaş aktif değil"; }
  else if (!shooter?.alive) { accepted = false; reason = "Yeniden doğmayı bekliyorsun"; }
  else if (!target || target.id === playerId) { accepted = false; reason = "Geçersiz hedef"; }
  else if (!target.alive || target.lives <= 0) { accepted = false; reason = "Hedef aktif değil"; }
  // Presence leases are transport health, not camera truth. A delayed
  // heartbeat must not reject a target the shooter can currently see.
  // Grenades use the explicit throw mode, while accepting primary for
  // already-shipped clients that predate the throw contract.
  else if (weapon.action !== "grenade" && weaponId === "knife" && fireMode !== "primary" && fireMode !== "throw") {
    accepted = false; reason = "Bıçak atış türü geçersiz";
  }
  else if (weapon.action !== "grenade" && weaponId !== "knife" && fireMode !== "primary") {
    accepted = false; reason = "Bu silah fırlatılamaz";
  }
  else if (!Number.isFinite(firedAt) || Math.abs(now - firedAt) > 5000) {
    accepted = false; reason = "Atış zaman aşımına uğradı";
  }
  else if (now < session.session.nextShotAt) {
    accepted = false; reason = "Atış çok hızlı";
  }

  if (accepted && target && shooter && weapon) {
    session.session.nextShotAt = now + weapon.interval;
    damage = weapon.damage;
    if (weaponId === "knife" && fireMode === "throw") damage = 58;
    // Headshots are intentionally unsupported: the camera sensor only
    // authenticates a marker, not a distinct authenticated body zone.
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp === 0) {
      eliminated = true;
      target.lives = Math.max(0, target.lives - 1);
      target.alive = false;
      target.respawnAt = target.lives > 0 ? now + 3000 : 0;
    }
    if (weapon.effect) {
      room.effects.push({
        id: id(),
        targetId: target.id,
        kind: weapon.effect,
        expiresAt: now + EFFECT_DURATION[weapon.effect],
      });
    }
    refresh(room);
    // Every accepted combat mutation advances the authoritative room revision,
    // even when multiple shots arrive within the same millisecond.
    touchRoom(room, now);
  }
  // Rejected but authenticated attempts are still a heartbeat; persist the
  // renewed lease as well as accepted combat mutations atomically.
  if (options.persist !== false) await persistRoom(room);

  return {
    accepted,
    reason,
    shooterId: playerId,
    targetId: target?.id ?? "",
    damage,
    eliminated,
    room: publicRoom(room, playerId),
  };
}

let expiryTimer: ReturnType<typeof setTimeout> | undefined;

async function sweepExpiredPlayersUnlocked(now: number): Promise<BattleRoom[]> {
  for (const [token, expiresAt] of expiredSessions) {
    if (expiresAt <= now) expiredSessions.delete(token);
  }

  const cohorts = new Map<number, Map<StoredBattleRoom, Set<string>>>();
  for (const session of sessions.values()) {
    const room = rooms.get(session.code);
    if (!room || !room.players.some((entry) => entry.id === session.playerId)) continue;
    const deadline = session.lastSeenAt + PLAYER_TIMEOUT_MS;
    if (deadline > now) continue;
    let roomsAtDeadline = cohorts.get(deadline);
    if (!roomsAtDeadline) {
      roomsAtDeadline = new Map<StoredBattleRoom, Set<string>>();
      cohorts.set(deadline, roomsAtDeadline);
    }
    let expiredIds = roomsAtDeadline.get(room);
    if (!expiredIds) {
      expiredIds = new Set<string>();
      roomsAtDeadline.set(room, expiredIds);
    }
    expiredIds.add(session.playerId);
  }

  const snapshots: BattleRoom[] = [];
  const snapshotIndexes = new Map<StoredBattleRoom, number>();
  for (const [deadline, roomsAtDeadline] of [...cohorts.entries()].sort(([left], [right]) => left - right)) {
    for (const [room, expiredIds] of roomsAtDeadline) {
      for (const [token, session] of sessions) {
        if (session.code === room.code && expiredIds.has(session.playerId)) {
          const tombstoneExpiresAt = deadline + EXPIRED_SESSION_RETENTION_MS;
          session.disconnectedAt = deadline;
          if (tombstoneExpiresAt > now) expiredSessions.set(token, tombstoneExpiresAt);
        }
      }
      room.players = room.players.filter((entry) => !expiredIds.has(entry.id));
      room.effects = room.effects.filter((effect) => !expiredIds.has(effect.targetId));
      transferHost(room);
      touchRoom(room, deadline);
      // Evaluate at the logical cohort deadline. A delayed sweep therefore
      // preserves the same respawn/effect/result ordering as live timers.
      refresh(room, deadline);
      const snapshot = publicRoom(room, "");
      const existingSnapshotIndex = snapshotIndexes.get(room);
      if (existingSnapshotIndex === undefined) {
        snapshotIndexes.set(room, snapshots.length);
        snapshots.push(snapshot);
      } else {
        snapshots[existingSnapshotIndex] = snapshot;
      }
      // There is no authenticated observer once every player has expired. The
      // final public snapshot above preserves the computed result. Retain only
      // the hashed expired sessions until their bounded tombstone deadline so a
      // different process can return SESSION_EXPIRED after reloading from DB.
      if (room.players.length === 0) {
        // joinRoom treats an empty retained row as absent.
      }
      await persistRoom(room);
    }
  }

  for (const room of [...rooms.values()]) {
    let changed = false;
    for (const [token, session] of sessions) {
      if (session.code !== room.code) continue;
      if (room.players.some((player) => player.id === session.playerId)) continue;
      if (session.lastSeenAt + PLAYER_TIMEOUT_MS + EXPIRED_SESSION_RETENTION_MS <= now) {
        sessions.delete(token);
        changed = true;
      }
    }
    if (!changed) continue;
    // A room can still have active players after one teammate's tombstone has
    // elapsed. Persisting this cleanup is what prevents a reloaded instance
    // (and the local scheduler) from repeatedly seeing the past deadline.
    if ([...sessions.values()].some((session) => session.code === room.code)) {
      await persistRoom(room);
    } else {
      rooms.delete(room.code);
      await removePersistedRoom(room.code);
    }
  }

  return snapshots;
}

const expiredSessions = new Map<string, number>();

function scheduleExpirySweep() {
  clearExpirySweep();
  let nextExpiryAt = Number.POSITIVE_INFINITY;
  for (const session of sessions.values()) {
    const room = rooms.get(session.code);
    const playerExists = room?.players.some((player) => player.id === session.playerId);
    nextExpiryAt = Math.min(
      nextExpiryAt,
      session.lastSeenAt + (playerExists ? PLAYER_TIMEOUT_MS : PLAYER_TIMEOUT_MS + EXPIRED_SESSION_RETENTION_MS),
    );
  }
  for (const expiresAt of expiredSessions.values()) {
    nextExpiryAt = Math.min(nextExpiryAt, expiresAt);
  }
  if (!Number.isFinite(nextExpiryAt)) return;

  expiryTimer = setTimeout(() => {
    expiryTimer = undefined;
    void sweepExpiredPlayers().catch((error) => {
      // An unattended expiry must not become an unhandled rejection. The
      // persisted state remains authoritative and the next operation retries it.
      console.error("Battle expiry sweep failed", error);
    });
  }, Math.max(0, nextExpiryAt - clock()));
  // Battle sessions must not keep an otherwise idle API process alive.
  expiryTimer.unref();
}

export function confirmFlashObservation(
  code: string,
  token: string,
  observedAt: number,
  confidence: number,
  shooterBeaconId: number,
) {
  return withStoreOperation(async () => {
    const observer = await authorizedRoom(code, token, { persistRefresh: false });
    const now = clock();
    if (!Number.isFinite(observedAt) || Math.abs(now - observedAt) > OBSERVATION_CLOCK_SKEW_MS) {
      return { accepted: false, reason: "OBSERVATION_EXPIRED" };
    }
    if (!Number.isFinite(confidence) || confidence < MIN_FLASH_CONFIDENCE || confidence > 1) {
      return { accepted: false, reason: "OBSERVATION_LOW_CONFIDENCE" };
    }
    if (!Number.isInteger(shooterBeaconId) || shooterBeaconId < 0 || shooterBeaconId >= MARKERS.length) {
      return { accepted: false, reason: "INVALID_BEACON" };
    }
    observer.room.pendingShotIntents = observer.room.pendingShotIntents.filter(
      (entry) => now - entry.createdAt <= SHOT_OBSERVATION_WINDOW_MS,
    );
    const candidates = observer.room.pendingShotIntents
      .filter((entry) =>
        entry.targetId === observer.playerId
        && observer.room.players.some((player) => player.id === entry.shooterId && player.markerId === shooterBeaconId)
        && entry.createdAt <= now
        && now - entry.createdAt <= SHOT_OBSERVATION_WINDOW_MS
        // The phone clock may differ from the server's, but a reading captured
        // well before the shot must never confirm it when delivered late.
        && observedAt >= entry.createdAt - 1000
      )
      .sort((a, b) => a.createdAt - b.createdAt);
    if (candidates.length === 0) {
      await persistRoom(observer.room);
      return { accepted: false, reason: "NO_MATCHING_SHOT" };
    }
    // One fresh sensor reading confirms at most one shot. Legal automatic
    // bursts must not make all of that shooter's pending shots ambiguous.
    const matching = candidates[0];
    const shooterSession = observer.room.sessions.find((entry) => entry.playerId === matching.shooterId);
    if (!shooterSession) return { accepted: false, reason: "SHOOTER_UNAVAILABLE" };
    observer.room.pendingShotIntents = observer.room.pendingShotIntents.filter(
      (entry) => entry.shotId !== matching.shotId || entry.shooterId !== matching.shooterId,
    );
    const result = await fireShotUnlocked(
      code,
      "",
      observer.room.players.find((entry) => entry.id === observer.playerId)?.markerId ?? -1,
      matching.firedAt,
      matching.weaponId,
      matching.fireMode,
      {
        authorized: {
          playerId: matching.shooterId,
          tokenHash: shooterSession.tokenHash,
          session: shooterSession,
          room: observer.room,
        },
        persist: false,
      },
    );
    observer.room.networkShotOutcomes = [
      ...observer.room.networkShotOutcomes,
      storedNetworkOutcome(matching.shotId, result),
    ].slice(-MAX_NETWORK_SHOT_OUTCOMES);
    await persistRoom(observer.room);
    return { ...result, shotId: matching.shotId, duplicate: false };
  });
}

const OBSERVATION_CLOCK_SKEW_MS = 5000;

const MIN_FLASH_CONFIDENCE = 0.65;
