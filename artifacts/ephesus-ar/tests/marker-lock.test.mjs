import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMarkerLockState,
  detectPlayerMarker,
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

test('camera detection authorizes a marker under the crosshair but ignores the same color away from aim', () => {
  const player = { markerId: 4, markerColor: '#ff0000' };
  const centered = new Uint8Array(100 * 100 * 4);
  const outside = new Uint8Array(100 * 100 * 4);
  for (let y = 42; y <= 58; y += 1) {
    for (let x = 42; x <= 58; x += 1) {
      const border = x <= 43 || x >= 57 || y <= 43 || y >= 57;
      const inner = x >= 47 && x <= 53 && y >= 47 && y <= 53 && !(x >= 49 && x <= 51 && y >= 49 && y <= 51);
      if (!border && !inner) continue;
      const offset = (y * 100 + x) * 4;
      centered[offset] = 255;
      centered[offset + 3] = 255;
    }
  }
  for (let y = 7; y <= 13; y += 1) {
    for (let x = 7; x <= 13; x += 1) {
      const offset = (y * 100 + x) * 4;
      outside[offset] = 255;
      outside[offset + 3] = 255;
    }
  }

  assert.equal(
    detectPlayerMarker(
      { width: 100, height: 100, data: centered },
      [player],
      { x: 0, y: 0 },
      { width: 100, height: 100 },
    ),
    4,
  );
  assert.equal(
    detectPlayerMarker(
      { width: 100, height: 100, data: outside },
      [player],
      { x: 0, y: 0 },
      { width: 100, height: 100 },
    ),
    null,
  );
});

test('camera detection rejects a solid same-color screen region', () => {
  const data = new Uint8Array(100 * 100 * 4);
  for (let y = 42; y <= 58; y += 1) {
    for (let x = 42; x <= 58; x += 1) {
      const offset = (y * 100 + x) * 4;
      data[offset] = 255;
      data[offset + 3] = 255;
    }
  }
  assert.equal(
    detectPlayerMarker(
      { width: 100, height: 100, data },
      [{ markerId: 4, markerColor: '#ff0000' }],
      { x: 0, y: 0 },
      { width: 100, height: 100 },
    ),
    null,
  );
});

test('camera detection rejects a TV-like irregular same-color texture at the crosshair', () => {
  const data = new Uint8Array(100 * 100 * 4);
  for (let y = 42; y <= 58; y += 1) {
    for (let x = 42; x <= 58; x += 1) {
      if ((x + y) % 3 === 0) continue;
      const offset = (y * 100 + x) * 4;
      data[offset] = 255;
      data[offset + 3] = 255;
    }
  }
  assert.equal(
    detectPlayerMarker(
      { width: 100, height: 100, data },
      [{ markerId: 4, markerColor: '#ff0000' }],
      { x: 0, y: 0 },
      { width: 100, height: 100 },
    ),
    null,
  );
});