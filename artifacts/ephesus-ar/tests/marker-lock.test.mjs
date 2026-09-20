import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMarkerLockState,
  updateMarkerAuthorization,
  updateMarkerLock,
} from '../lib/marker-detection.ts';

test('marker lock requires two consecutive detections', () => {
  const state = createMarkerLockState();
  assert.equal(updateMarkerLock(state, 2, 1000), null);
  assert.equal(updateMarkerLock(state, 2, 1100), 2);
});

test('marker lock survives one missed frame then expires', () => {
  const state = createMarkerLockState();
  updateMarkerLock(state, 1, 1000);
  assert.equal(updateMarkerLock(state, 1, 1100), 1);
  assert.equal(updateMarkerLock(state, null, 1500, { holdMs: 500 }), 1);
  assert.equal(updateMarkerLock(state, null, 1601, { holdMs: 500 }), null);
});

test('marker lock hold exceeds the one-second compatibility cadence', () => {
  const state = createMarkerLockState();
  updateMarkerLock(state, 3, 1000);
  assert.equal(updateMarkerLock(state, 3, 1100), 3);
  assert.equal(updateMarkerLock(state, null, 2100), 3);
  assert.equal(updateMarkerLock(state, null, 2351), null);
});

test('damage authorization clears on the first missing marker frame', () => {
  const state = createMarkerLockState();
  updateMarkerAuthorization(state, 2, 1000);
  assert.equal(updateMarkerAuthorization(state, 2, 1100), 2);
  assert.equal(updateMarkerAuthorization(state, null, 1200), null);
});

test('damage authorization never carries target A while confirming target B', () => {
  const state = createMarkerLockState();
  updateMarkerAuthorization(state, 2, 1000);
  assert.equal(updateMarkerAuthorization(state, 2, 1100), 2);
  assert.equal(updateMarkerAuthorization(state, 3, 1200), null);
  assert.equal(updateMarkerAuthorization(state, 3, 1300), 3);
});