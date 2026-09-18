import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  configureBattleStore,
  createRoom,
  fireShotByPlayerId,
  fireShot,
  getRoom,
  heartbeatRoom,
  authenticateBattleSession,
  InMemoryBattlePersistence,
  joinRoom,
  LEASE_TIMEOUT_MS,
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
  now += LEASE_TIMEOUT_MS + 1;
  const state = (await getRoom(host.room.code, host.sessionToken)).room;
  assert.equal(state.players.find((player) => player.id === host.playerId).connected, true);
  assert.equal(state.players.find((player) => player.id === opponent.playerId).connected, false);
  assert.equal((await heartbeatRoom(host.room.code, opponent.sessionToken)).room.players.every((player) => player.connected), true);
});

test("expires leases at thirty seconds, returns a bounded terminal tombstone, and cleans it", async () => {
  const { host, opponent } = await activeRoom();
  now += PLAYER_TIMEOUT_MS - 1;
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

  now += PLAYER_TIMEOUT_MS;
  await sweepExpiredPlayers();
  await assert.rejects(
    () => getRoom(host.room.code, opponent.sessionToken),
    (error) => error instanceof Error && error.message === "ROOM_NOT_FOUND",
  );
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
  failingPersistence.failNextSave = true;
  await assert.rejects(() => createRoom("rollback-host", "red"), /PERSISTENCE_WRITE_FAILED/);
  const recovered = await createRoom("recovered-host", "red");
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