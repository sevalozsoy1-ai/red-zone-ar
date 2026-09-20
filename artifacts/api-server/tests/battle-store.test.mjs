import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  configureBattleStore,
  createRoom,
  fireShotByPlayerId,
  fireShot,
  getRoom,
  getPublicBattleSnapshot,
  heartbeatRoom,
  authenticateBattleSession,
  InMemoryBattlePersistence,
  joinRoom,
  LEASE_TIMEOUT_MS,
  RECONNECT_GRACE_MS,
  leaveRoom,
  PLAYER_TIMEOUT_MS,
  resetBattleStoreForTests,
  startRoom,
  sweepExpiredPlayers,
} from "../src/lib/battle-store.ts";

const persistence = new InMemoryBattlePersistence();
let now = 1_000_000;

beforeEach(async () => {
  now = 1_000_000;
  persistence.clear();
  configureBattleStore({ persistence, now: () => now });
  await resetBattleStoreForTests();
});

async function activeRoom() {
  const host = await createRoom("host", "red");
  const opponent = await joinRoom(host.room.code, "opponent", "blue");
  return { host, opponent };
}

test("serializes concurrent joins with durable marker and capacity checks", async () => {
  const host = await createRoom("concurrent-host", "red");
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, (_, index) => joinRoom(host.room.code, `parallel-${index}`, index % 2 ? "blue" : "red")),
  );
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 9);
  assert.equal(results.filter((result) => result.status === "rejected" && result.reason?.message === "ROOM_FULL").length, 3);
  const room = (await getRoom(host.room.code, host.sessionToken)).room;
  assert.equal(room.players.length, 10);
  assert.equal(new Set(room.players.map((player) => player.markerId)).size, 10);
});

test("deduplicates retried room creation and joins by stable request id", async () => {
  const createRequestId = "create-retry-request-0001";
  const firstHost = await createRoom("host", createRequestId);
  await resetBattleStoreForTests();
  const retriedHost = await createRoom("host", createRequestId);
  assert.equal(retriedHost.room.code, firstHost.room.code);
  assert.equal(retriedHost.playerId, firstHost.playerId);
  assert.notEqual(retriedHost.sessionToken, firstHost.sessionToken);

  const joinRequestId = "join-retry-request-0001";
  const firstJoin = await joinRoom(retriedHost.room.code, "opponent", joinRequestId);
  await resetBattleStoreForTests();
  const retriedJoin = await joinRoom(firstHost.room.code, "opponent", joinRequestId);
  assert.equal(retriedJoin.playerId, firstJoin.playerId);
  assert.notEqual(retriedJoin.sessionToken, firstJoin.sessionToken);

  const room = (await getRoom(firstHost.room.code, retriedJoin.sessionToken)).room;
  assert.equal(room.players.length, 2);
});

test("does not let an old entry request resurrect a player after reconnect grace", async () => {
  const requestId = "expired-create-request-0001";
  const first = await createRoom("expired-host", requestId);
  now += RECONNECT_GRACE_MS + 1;
  await resetBattleStoreForTests();

  const retried = await createRoom("expired-host", requestId);
  assert.notEqual(retried.playerId, first.playerId);
  assert.notEqual(retried.room.code, first.room.code);
});

test("uses bearer-session identity and persists reconnectable sessions across restart", async () => {
  const { host, opponent } = await activeRoom();
  const markerId = opponent.room.players.find((player) => player.id === opponent.playerId).markerId;
  const shot = await fireShot(host.room.code, host.sessionToken, markerId, now, "m4a1", "primary");
  assert.equal(shot.accepted, true);
  await assert.rejects(
    () => heartbeatRoom(host.room.code, "forged-bearer-token"),
    (error) => error instanceof Error && error.message === "UNAUTHORIZED",
  );

  await resetBattleStoreForTests();
  const resumed = await getRoom(host.room.code, host.sessionToken);
  assert.equal(resumed.room.players.length, 2);
  assert.equal(resumed.room.players.every((player) => player.connected), true);
});

test("authenticates the socket session and resolves a network target by player id", async () => {
  const { host, opponent } = await activeRoom();
  const authenticated = await authenticateBattleSession(host.room.code, host.sessionToken);
  assert.deepEqual(authenticated, { roomCode: host.room.code, playerId: host.playerId });
  await assert.rejects(
    () => authenticateBattleSession(host.room.code, "forged-bearer-token"),
    (error) => error instanceof Error && error.message === "UNAUTHORIZED",
  );

  const shotId = "11111111-1111-4111-8111-111111111111";
  const accepted = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    shotId,
    opponent.playerId,
    now,
    "m4a1",
    "primary",
  );
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.targetId, opponent.playerId);
  assert.equal(accepted.damage, 18);
  assert.equal(accepted.duplicate, false);
});

test("rejects network self-targets and deduplicates repeated shot ids", async () => {
  const { host, opponent } = await activeRoom();
  const selfShot = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "22222222-2222-4222-8222-222222222222",
    host.playerId,
    now,
    "m4a1",
    "primary",
  );
  assert.equal(selfShot.accepted, false);
  assert.equal(selfShot.reason, "Geçersiz hedef");

  const shotId = "33333333-3333-4333-8333-333333333333";
  const first = await fireShotByPlayerId(host.room.code, host.sessionToken, shotId, opponent.playerId, now, "m4a1", "primary");
  const duplicate = await fireShotByPlayerId(host.room.code, host.sessionToken, shotId, opponent.playerId, now, "m4a1", "primary");
  assert.equal(first.accepted, true);
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.damage, first.damage);
  assert.equal((await getRoom(host.room.code, opponent.sessionToken)).room.players.find((player) => player.id === opponent.playerId).hp, 82);
});

test("rejects disconnected targets on marker and network shot paths", async () => {
  const { host, opponent } = await activeRoom();
  const targetMarker = opponent.room.players.find((player) => player.id === opponent.playerId).markerId;
  now += LEASE_TIMEOUT_MS + 1;

  const markerShot = await fireShot(host.room.code, host.sessionToken, targetMarker, now, "m4a1", "primary");
  assert.equal(markerShot.accepted, false);
  assert.equal(markerShot.reason, "Hedef bağlantısı yok");

  const networkShot = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "12121212-1212-4212-8212-121212121212",
    opponent.playerId,
    now,
    "m4a1",
    "primary",
  );
  assert.equal(networkShot.accepted, false);
  assert.equal(networkShot.reason, "Hedef bağlantısı yok");
  const room = (await getRoom(host.room.code, host.sessionToken)).room;
  assert.equal(room.players.find((player) => player.id === opponent.playerId).hp, 100);
});

test("deduplicates a network shot after the store is rehydrated", async () => {
  const { host, opponent } = await activeRoom();
  const shotId = "44444444-4444-4444-8444-444444444444";
  const first = await fireShotByPlayerId(host.room.code, host.sessionToken, shotId, opponent.playerId, now, "m4a1", "primary");
  assert.equal(first.accepted, true);

  await resetBattleStoreForTests();
  const retry = await fireShotByPlayerId(host.room.code, host.sessionToken, shotId, opponent.playerId, now, "m4a1", "primary");
  assert.equal(retry.duplicate, true);
  assert.equal(retry.damage, first.damage);
  const room = (await getRoom(host.room.code, opponent.sessionToken)).room;
  assert.equal(room.players.find((player) => player.id === opponent.playerId).hp, 82);
});

test("state polling renews only its authenticated lease and stale leases expose disconnect state", async () => {
  const { host, opponent } = await activeRoom();
  const opponentBefore = opponent.room.players.find((player) => player.id === opponent.playerId);
  now += RECONNECT_GRACE_MS - 1;
  const state = (await getRoom(host.room.code, host.sessionToken)).room;
  assert.equal(state.players.find((player) => player.id === host.playerId).connected, true);
  assert.equal(state.players.find((player) => player.id === opponent.playerId).connected, false);
  assert.equal(state.status, "active");
  const resumed = (await heartbeatRoom(host.room.code, opponent.sessionToken)).room;
  const opponentAfter = resumed.players.find((player) => player.id === opponent.playerId);
  assert.equal(resumed.status, "active");
  assert.equal(opponentAfter.connected, true);
  assert.equal(opponentAfter.markerId, opponentBefore.markerId);
  assert.equal(opponentAfter.lives, opponentBefore.lives);
});

test("keeps a disconnected player for the 90-second reconnect grace, then finishes deterministically", async () => {
  const { host, opponent } = await activeRoom();
  now += RECONNECT_GRACE_MS - 1;
  await getRoom(host.room.code, host.sessionToken);
  now += 2;

  await assert.rejects(
    () => getRoom(host.room.code, opponent.sessionToken),
    (error) => error instanceof Error && error.message === "SESSION_EXPIRED",
  );
  // Tombstones are represented by retained hashed sessions in the durable
  // room snapshot, so another process has the same terminal response.
  await resetBattleStoreForTests();
  await assert.rejects(
    () => getRoom(host.room.code, opponent.sessionToken),
    (error) => error instanceof Error && error.message === "SESSION_EXPIRED",
  );
  const state = (await getRoom(host.room.code, host.sessionToken)).room;
  assert.equal(state.players.length, 1);
  assert.equal(state.status, "finished");
  assert.equal(state.winnerPlayerId, host.playerId);

  now += RECONNECT_GRACE_MS;
  await sweepExpiredPlayers();
  await assert.rejects(
    () => getRoom(host.room.code, opponent.sessionToken),
    (error) => error instanceof Error && error.message === "ROOM_NOT_FOUND",
  );
});

test("does not finish a two-player battle merely because one player misses heartbeats", async () => {
  const { host } = await activeRoom();
  now += LEASE_TIMEOUT_MS + 1;
  const state = (await getRoom(host.room.code, host.sessionToken)).room;
  assert.equal(state.status, "active");
  assert.equal(state.players.length, 2);
  assert.equal(state.players.filter((player) => !player.connected).length, 1);
});

test("cleans an expired session from a mixed active room after retention", async () => {
  const { host, opponent } = await activeRoom();
  // Keep the host active beyond the opponent's expiry and tombstone windows.
  now += PLAYER_TIMEOUT_MS - 1;
  await heartbeatRoom(host.room.code, host.sessionToken);
  now += PLAYER_TIMEOUT_MS - 1;
  await heartbeatRoom(host.room.code, host.sessionToken);
  now += 2;

  await sweepExpiredPlayers();
  const [snapshot] = await persistence.load();
  assert.equal(snapshot.players.length, 1);
  assert.equal(snapshot.players[0].id, host.playerId);
  assert.equal(snapshot.sessions.length, 1);
  assert.equal(snapshot.sessions[0].playerId, host.playerId);

  // There is no stale no-player session left to schedule at a past deadline.
  assert.deepEqual(await sweepExpiredPlayers(), []);
  await assert.rejects(
    () => getRoom(host.room.code, opponent.sessionToken),
    (error) => error instanceof Error && error.message === "UNAUTHORIZED",
  );
});

test("processes equal expiry deadlines as one draw cohort", async () => {
  const { host, opponent } = await activeRoom();
  now += PLAYER_TIMEOUT_MS;
  const snapshots = await sweepExpiredPlayers();
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].status, "finished");
  assert.equal(snapshots[0].winnerPlayerId, null);
  assert.equal(snapshots[0].draw, true);
  assert.equal(snapshots[0].players.length, 0);
  await assert.rejects(
    () => getRoom(host.room.code, host.sessionToken),
    (error) => error instanceof Error && error.message === "SESSION_EXPIRED",
  );
  await assert.rejects(
    () => getRoom(opponent.room.code, opponent.sessionToken),
    (error) => error instanceof Error && error.message === "SESSION_EXPIRED",
  );
});

test("processes a delayed sweep by chronological deadline cohorts", async () => {
  const host = await createRoom("cohort-host", "red");
  now += 1;
  const opponent = await joinRoom(host.room.code, "cohort-opponent", "blue");
  now += PLAYER_TIMEOUT_MS;
  const snapshots = await sweepExpiredPlayers();
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].winnerPlayerId, opponent.playerId);
  assert.equal(snapshots[0].draw, false);
  assert.equal(snapshots[0].players.length, 0);
  await assert.rejects(
    () => getRoom(host.room.code, host.sessionToken),
    (error) => error instanceof Error && error.message === "SESSION_EXPIRED",
  );
  await assert.rejects(
    () => getRoom(opponent.room.code, opponent.sessionToken),
    (error) => error instanceof Error && error.message === "SESSION_EXPIRED",
  );
});

test("finishes free-for-all only when one started player remains", async () => {
  const host = await createRoom("winner-host", "red");
  const ally = await joinRoom(host.room.code, "winner-ally", "red");
  const loser = await joinRoom(host.room.code, "loser", "blue");
  await leaveRoom(host.room.code, loser.sessionToken);
  const before = (await getRoom(host.room.code, host.sessionToken)).room;
  assert.equal(before.status, "active");
  await leaveRoom(host.room.code, ally.sessionToken);
  const after = (await getRoom(host.room.code, host.sessionToken)).room;
  assert.equal(after.status, "finished");
  assert.equal(after.winnerPlayerId, host.playerId);
});

test("allows free-for-all hits and preserves authoritative cooldown rules", async () => {
  const { host, opponent } = await activeRoom();
  const targetMarker = opponent.room.players.find((player) => player.id === opponent.playerId).markerId;
  const first = await fireShot(host.room.code, host.sessionToken, targetMarker, now, "m4a1", "primary");
  assert.equal(first.accepted, true);
  const rapid = await fireShot(host.room.code, host.sessionToken, targetMarker, now, "m4a1", "primary");
  assert.equal(rapid.accepted, false);
  assert.equal(rapid.reason, "Atış çok hızlı");
});

test("accepts sequential legal network shots while retaining per-shot deduplication", async () => {
  const { host, opponent } = await activeRoom();
  const first = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "66666666-6666-4666-8666-666666666666",
    opponent.playerId,
    now,
    "m4a1",
    "primary",
  );
  now += 96;
  const second = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "77777777-7777-4777-8777-777777777777",
    opponent.playerId,
    now,
    "m4a1",
    "primary",
  );
  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);
  assert.equal(second.duplicate, false);
  const replay = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "66666666-6666-4666-8666-666666666666",
    opponent.playerId,
    now,
    "m4a1",
    "primary",
  );
  assert.equal(replay.duplicate, true);
  assert.equal(replay.damage, first.damage);
});

test("public socket snapshots filter targeted effects per viewer without renewing presence", async () => {
  const { host, opponent } = await activeRoom();
  const result = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "88888888-8888-4888-8888-888888888888",
    opponent.playerId,
    now,
    "frag-grenade",
    "throw",
  );
  assert.equal(result.accepted, true);
  const hostView = await getPublicBattleSnapshot(host.room.code, host.sessionToken);
  const opponentView = await getPublicBattleSnapshot(opponent.room.code, opponent.sessionToken);
  assert.equal(hostView.room.effects.length, 0);
  assert.equal(opponentView.room.effects.length, 1);

  now += LEASE_TIMEOUT_MS + 1;
  const after = await getPublicBattleSnapshot(host.room.code, host.sessionToken);
  assert.equal(after.room.players.find((player) => player.id === host.playerId).connected, false);
});

test("accepts legacy primary grenade shots and rejects unsupported throw modes", async () => {
  const { host, opponent } = await activeRoom();
  const legacy = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "99999999-9999-4999-8999-999999999999",
    opponent.playerId,
    now,
    "frag-grenade",
    "primary",
  );
  assert.equal(legacy.accepted, true);

  const invalid = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    opponent.playerId,
    now,
    "frag-grenade",
    "burst",
  );
  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reason, "Geçersiz atış türü");
});

test("rejects throw mode for firearms", async () => {
  const { host, opponent } = await activeRoom();
  const result = await fireShotByPlayerId(
    host.room.code,
    host.sessionToken,
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    opponent.playerId,
    now,
    "m4a1",
    "throw",
  );
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "Bu silah fırlatılamaz");
});

test("rolls back a failed durable write without poisoning later operations", async () => {
  class FailingPersistence extends InMemoryBattlePersistence {
    failNextSave = false;

    async save(room) {
      if (this.failNextSave) {
        this.failNextSave = false;
        throw new Error("PERSISTENCE_WRITE_FAILED");
      }
      return super.save(room);
    }
  }

  const failingPersistence = new FailingPersistence();
  configureBattleStore({ persistence: failingPersistence, now: () => now });
  await resetBattleStoreForTests();
  const requestId = "rollback-create-request-0001";
  failingPersistence.failNextSave = true;
  await assert.rejects(() => createRoom("rollback-host", requestId), /PERSISTENCE_WRITE_FAILED/);
  const recovered = await createRoom("recovered-host", requestId);
  assert.equal((await getRoom(recovered.room.code, recovered.sessionToken)).room.code, recovered.room.code);
});

test("does not retain a network dedupe outcome when its combined commit fails", async () => {
  class FailingPersistence extends InMemoryBattlePersistence {
    failNextSave = false;

    async save(room) {
      if (this.failNextSave) {
        this.failNextSave = false;
        throw new Error("PERSISTENCE_WRITE_FAILED");
      }
      return super.save(room);
    }
  }

  const failingPersistence = new FailingPersistence();
  configureBattleStore({ persistence: failingPersistence, now: () => now });
  await resetBattleStoreForTests();
  const host = await createRoom("commit-host", "red");
  const opponent = await joinRoom(host.room.code, "commit-opponent", "blue");
  const shotId = "55555555-5555-4555-8555-555555555555";
  failingPersistence.failNextSave = true;
  await assert.rejects(
    () => fireShotByPlayerId(host.room.code, host.sessionToken, shotId, opponent.playerId, now, "m4a1", "primary"),
    /PERSISTENCE_WRITE_FAILED/,
  );

  await resetBattleStoreForTests();
  const afterFailure = (await getRoom(host.room.code, opponent.sessionToken)).room;
  assert.equal(afterFailure.players.find((player) => player.id === opponent.playerId).hp, 100);
  const retry = await fireShotByPlayerId(host.room.code, host.sessionToken, shotId, opponent.playerId, now, "m4a1", "primary");
  assert.equal(retry.accepted, true);
  assert.equal(retry.duplicate, false);
});