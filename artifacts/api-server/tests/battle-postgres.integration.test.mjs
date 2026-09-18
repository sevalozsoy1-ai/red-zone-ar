import test from "node:test";
import assert from "node:assert/strict";

const integration = process.env.DATABASE_URL ? test : test.skip;
const storeUrl = new URL("../src/lib/battle-store.ts", import.meta.url).href;
const stores = await Promise.all([
  import(`${storeUrl}?postgres-instance-a`),
  import(`${storeUrl}?postgres-instance-b`),
]);

integration("serializes two PostgreSQL store instances and reloads after restart", async () => {
  const [first, second] = stores;
  first.configureBattleStore();
  second.configureBattleStore();
  let host;
  let tokens = [];
  try {
    host = await first.createRoom("pg-concurrency-host", "red");
    tokens = [host.sessionToken];
    await second.initializeBattleStore();
    const freshSecondInstance = await second.getRoom(host.room.code, host.sessionToken);
    assert.equal(freshSecondInstance.room.players.find((player) => player.id === host.playerId).connected, true);
    assert.equal(freshSecondInstance.room.updatedAt, host.room.updatedAt);

    const joined = await Promise.allSettled([
      first.joinRoom(host.room.code, "pg-a", "blue"),
      second.joinRoom(host.room.code, "pg-b", "blue"),
      first.joinRoom(host.room.code, "pg-c", "red"),
      second.joinRoom(host.room.code, "pg-d", "red"),
    ]);
    tokens.push(
      ...joined
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value.sessionToken),
    );
    assert.equal(joined.filter((result) => result.status === "fulfilled").length, 4);

    await second.resetBattleStoreForTests();
    const restarted = await second.getRoom(host.room.code, host.sessionToken);
    assert.equal(restarted.room.players.length, 5);
    assert.equal(new Set(restarted.room.players.map((player) => player.markerId)).size, 5);

  } finally {
    if (host) {
      await Promise.allSettled(tokens.map((token) => first.leaveRoom(host.room.code, token)));
      await first.resetBattleStoreForTests();
    }
  }
  await assert.rejects(() => first.getRoom(host.room.code, host.sessionToken), /ROOM_NOT_FOUND|UNAUTHORIZED/);
});