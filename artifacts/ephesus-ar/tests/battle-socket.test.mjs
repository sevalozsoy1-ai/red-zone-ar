import assert from 'node:assert/strict';
import test from 'node:test';

import { nextShotRetryDelay, removePendingShotIntent } from '../lib/battle-socket-utils.ts';

test('timed-out shot intent is removed before local refund', () => {
  const pending = new Map([['shot-1', { shotId: 'shot-1' }]]);
  removePendingShotIntent(pending, 'shot-1');
  assert.equal(pending.has('shot-1'), false);
});

test('independent shot ids can be acknowledged out of order without affecting each other', () => {
  const pending = new Map([
    ['shot-a', { shotId: 'shot-a', weaponId: 'mp5' }],
    ['shot-b', { shotId: 'shot-b', weaponId: 'mp5' }],
  ]);
  removePendingShotIntent(pending, 'shot-b');
  assert.equal(pending.has('shot-a'), true);
  assert.equal(pending.has('shot-b'), false);
  removePendingShotIntent(pending, 'shot-a');
  assert.equal(pending.size, 0);
});

test('transport retry policy is bounded and does not create an unbounded queue', () => {
  assert.equal(nextShotRetryDelay(1, 3, 100), 100);
  assert.equal(nextShotRetryDelay(2, 3, 100), 200);
  assert.equal(nextShotRetryDelay(3, 3, 100), null);
  assert.equal(nextShotRetryDelay(0, 3, 100), null);
});