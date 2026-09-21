import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TARGET_TAG_COUNT,
  getEligibleQrTarget,
  getQrTargetMode,
  isFreshQrObservation,
  isQrWithinExpandedHitRegion,
  parseTargetPayload,
  parseRoomJoinPayload,
  roomJoinPayload,
  targetPayload,
} from '../lib/qr-target.ts';

const player = (id, markerId, overrides = {}) => ({
  id, markerId, name: id, markerColor: '#fff', lives: 3, hp: 100,
  alive: true, respawnAt: 0, isHost: false, connected: true, ...overrides,
});

test('permanent target payloads are strict and map 1..10 to marker ids 0..9', () => {
  assert.equal(TARGET_TAG_COUNT, 10);
  assert.equal(targetPayload(0), 'RZ:T:01:1');
  assert.equal(parseTargetPayload('RZ:T:10:1'), 9);
  assert.equal(parseTargetPayload('RZ:T:11:1'), null);
  assert.equal(parseTargetPayload('RZ:T:01:2'), null);
  assert.equal(parseTargetPayload('RZ:T:01:1:token'), null);
  assert.equal(parseTargetPayload('RZ:R:ABC123:1'), null);
});

test('room join payloads contain only a strict six-character room code', () => {
  assert.equal(roomJoinPayload('abc123'), 'RZ:R:ABC123:1');
  assert.equal(parseRoomJoinPayload('RZ:R:abc123:1'), 'ABC123');
  assert.equal(parseRoomJoinPayload('RZ:R:ABC123:2'), null);
  assert.equal(parseRoomJoinPayload('RZ:R:ABC1234:1'), null);
  assert.equal(parseRoomJoinPayload('RZ:T:01:1'), null);
  assert.throws(() => roomJoinPayload('ABC-12'), /ROOM_CODE_INVALID/);
});

test('QR hit region expands three observed widths around the reticle', () => {
  const viewport = { width: 400, height: 800 };
  assert.equal(isQrWithinExpandedHitRegion({
    cornerPoints: [{ x: 180, y: 390 }, { x: 200, y: 390 }, { x: 200, y: 410 }, { x: 180, y: 410 }],
  }, viewport), true);
  assert.equal(isQrWithinExpandedHitRegion({
    cornerPoints: [{ x: 1, y: 390 }, { x: 21, y: 390 }, { x: 21, y: 410 }, { x: 1, y: 410 }],
  }, viewport), false);
});

test('invalid geometry is rejected rather than granting an arbitrary center hit', () => {
  assert.equal(isQrWithinExpandedHitRegion({ cornerPoints: [{ x: 1, y: 1 }] }, { width: 400, height: 800 }), false);
  assert.equal(isQrWithinExpandedHitRegion({ bounds: { origin: { x: -2, y: 390 }, size: { width: 20, height: 20 } } }, { width: 400, height: 800 }), false);
});

test('freshness expires within the 300ms sensor window', () => {
  assert.equal(isFreshQrObservation(1000, 1300), true);
  assert.equal(isFreshQrObservation(1000, 1301), false);
  assert.equal(isFreshQrObservation(1000, 999), false);
});

test('hybrid target mode distinguishes fresh, retained, automatic, and empty locks', () => {
  assert.equal(getQrTargetMode({ observedAt: 1000, now: 1200, hasRetainedTarget: true, hasAutomaticTarget: false }), 'fresh');
  assert.equal(getQrTargetMode({ observedAt: 1000, now: 1400, hasRetainedTarget: true, hasAutomaticTarget: false }), 'retained');
  assert.equal(getQrTargetMode({ now: 1400, hasRetainedTarget: false, hasAutomaticTarget: true }), 'automatic');
  assert.equal(getQrTargetMode({ now: 1400, hasRetainedTarget: false, hasAutomaticTarget: false }), 'none');
});

test('self, dead, missing, and out-of-range targets never become eligible', () => {
  const players = [player('self', 0), player('enemy', 1), player('dead', 2, { alive: false }), player('offline', 3, { connected: false })];
  assert.equal(getEligibleQrTarget(players, 'self', 0), null);
  assert.equal(getEligibleQrTarget(players, 'self', 1)?.id, 'enemy');
  assert.equal(getEligibleQrTarget(players, 'self', 2), null);
  assert.equal(getEligibleQrTarget(players, 'self', 3), null);
  assert.equal(getEligibleQrTarget(players, 'self', 9), null);
  assert.equal(getEligibleQrTarget(players, 'self', null), null);
});