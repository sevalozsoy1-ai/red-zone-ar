import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canCommitTorchTimeout,
  canPulseCameraTorch,
  invalidateCameraTorch,
  isPostMountFireSignal,
} from '../lib/camera-torch.ts';

test('torch pulse is allowed only for a mounted rear camera with permission', () => {
  assert.equal(canPulseCameraTorch({
    platform: 'android',
    facing: 'back',
    permissionGranted: true,
    mounted: true,
  }), true);
  assert.equal(canPulseCameraTorch({
    platform: 'ios',
    facing: 'back',
    permissionGranted: true,
    mounted: true,
  }), true);
});

test('missing torch capability conditions safely become a no-op', () => {
  for (const condition of [
    { platform: 'web', facing: 'back', permissionGranted: true, mounted: true },
    { platform: 'android', facing: 'front', permissionGranted: true, mounted: true },
    { platform: 'android', facing: 'back', permissionGranted: false, mounted: true },
    { platform: 'android', facing: 'back', permissionGranted: true, mounted: false },
  ]) {
    assert.equal(canPulseCameraTorch(condition), false);
  }
});

test('initial and duplicate fire signals are ignored while a strict increment fires once', () => {
  assert.equal(isPostMountFireSignal(0, 0), false);
  assert.equal(isPostMountFireSignal(4, 4), false);
  assert.equal(isPostMountFireSignal(4, 3), false);
  assert.equal(isPostMountFireSignal(0, 1), true);
});

test('lifecycle invalidation disables torch and rejects stale timeouts', () => {
  const active = { generation: 4, enabled: true };
  const invalidated = invalidateCameraTorch(active);
  assert.deepEqual(invalidated, { generation: 5, enabled: false });
  assert.equal(canCommitTorchTimeout(4, invalidated, true), false);
  assert.equal(canCommitTorchTimeout(5, invalidated, false), false);
  assert.equal(canCommitTorchTimeout(5, { generation: 5, enabled: true }, true), true);
});