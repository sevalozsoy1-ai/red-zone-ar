import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.ts";
import {
  configureBattleStore,
  createRoom,
  InMemoryBattlePersistence,
  joinRoom,
  LEASE_TIMEOUT_MS,
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

test("keeps a locked player reconnectable through the heartbeat route", async () => {
  const host = await createRoom("route-host", "red");
  const opponent = await joinRoom(host.room.code, "route-opponent", "blue");
  now += LEASE_TIMEOUT_MS + 1;

  const stateResponse = await fetch(`${baseUrl}/api/battle/state?code=${host.room.code}`, {
    headers: { Authorization: `Bearer ${host.sessionToken}` },
  });
  assert.equal(stateResponse.status, 200);
  const disconnected = await stateResponse.json();
  const opponentBefore = disconnected.room.players.find((player) => player.id === opponent.playerId);
  assert.equal(disconnected.room.status, "active");
  assert.equal(opponentBefore.connected, false);

  const heartbeat = await fetch(`${baseUrl}/api/battle/rooms/${host.room.code}/heartbeat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${opponent.sessionToken}` },
  });
  assert.equal(heartbeat.status, 200);
  const resumed = await heartbeat.json();
  const opponentAfter = resumed.room.players.find((player) => player.id === opponent.playerId);
  assert.equal(opponentAfter.connected, true);
  assert.equal(opponentAfter.markerId, opponentBefore.markerId);
  assert.equal(opponentAfter.lives, opponentBefore.lives);
});

test("accepts an idempotent player-targeted shot over authenticated HTTP", async () => {
  const host = await createRoom("network-route-host", "network-route-host-request");
  const opponent = await joinRoom(host.room.code, "network-route-opponent", "network-route-opponent-request");
  const shotId = "network-route-shot-0001";
  const payload = {
    shotId,
    targetPlayerId: opponent.playerId,
    firedAt: now,
    weaponId: "m4a1",
    fireMode: "primary",
  };
  const send = () => fetch(`${baseUrl}/api/battle/rooms/${host.room.code}/network-shots`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${host.sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const first = await send();
  assert.equal(first.status, 200);
  const firstResult = await first.json();
  assert.equal(firstResult.accepted, true);
  assert.equal(firstResult.targetId, opponent.playerId);
  assert.equal(firstResult.damage, 18);

  const duplicate = await send();
  assert.equal(duplicate.status, 200);
  const duplicateResult = await duplicate.json();
  assert.equal(duplicateResult.accepted, true);

  const state = await fetch(`${baseUrl}/api/battle/state?code=${host.room.code}`, {
    headers: { Authorization: `Bearer ${opponent.sessionToken}` },
  });
  assert.equal(state.status, 200);
  const statePayload = await state.json();
  assert.equal(statePayload.room.players.find((player) => player.id === opponent.playerId).hp, 82);
});
