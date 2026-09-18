import test from 'node:test';
import assert from 'node:assert/strict';
import { aimOffsetForScreenPoint, clampAimOffset, getAimLimits } from '../lib/aim.ts';

test('camera aim uses the same centered limits as joystick aim', () => {
  const limits = getAimLimits(400, 720);
  assert.deepEqual(limits, { x: 160, y: 200 });
  assert.deepEqual(clampAimOffset({ x: 999, y: -999 }, 400, 720), { x: 160, y: -200 });
});

test('screen taps become centered, clamped aim offsets', () => {
  assert.deepEqual(aimOffsetForScreenPoint(200, 360, 400, 720), { x: 0, y: 0 });
  assert.deepEqual(aimOffsetForScreenPoint(0, 0, 400, 720), { x: -160, y: -200 });
});