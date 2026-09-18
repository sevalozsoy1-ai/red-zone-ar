import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.ts";
import {
  configureBattleStore,
  createRoom,
  InMemoryBattlePersistence,
  resetBattleStoreForTests,
} from "../src/lib/battle-store.ts";

const persistence = new InMemoryBattlePersistence();
let now = 2_000_000;
let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(async () => {
  now = 2_000_000;
  persistence.clear();
  configureBattleStore({ persistence, now: () => now });
  await resetBattleStoreForTests();
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("requires bearer authorization for polling and heartbeat, without putting the token in the URL", async () => {
  const room = await createRoom("route-host", "red");
  const stateUrl = `${baseUrl}/api/battle/state?code=${room.room.code}`;

  const missing = await fetch(stateUrl);
  assert.equal(missing.status, 401);
  const unauthorizedHeartbeat = await fetch(`${baseUrl}/api/battle/rooms/${room.room.code}/heartbeat`, { method: "POST" });
  assert.equal(unauthorizedHeartbeat.status, 401);

  const heartbeat = await fetch(`${baseUrl}/api/battle/rooms/${room.room.code}/heartbeat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${room.sessionToken}` },
  });
  assert.equal(heartbeat.status, 200);
  assert.equal(stateUrl.includes(room.sessionToken), false);

  const state = await fetch(stateUrl, {
    headers: { Authorization: `Bearer ${room.sessionToken}` },
  });
  assert.equal(state.status, 200);
  const payload = await state.json();
  assert.equal(payload.playerId, room.playerId);
});