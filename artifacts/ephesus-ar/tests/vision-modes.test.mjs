import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VISION_UNLOCKS,
  VISION_MODE_PRICE,
  VISION_UNLOCK_DURATION_MS,
  unlockVisionModeFromCredits,
} from '../lib/vision-modes.ts';

test('vision credit unlock is idempotent when the same request is repeated', () => {
  const now = 1_700_000_000_000;
  const initial = { creditCents: 75, visionUnlocks: { ...DEFAULT_VISION_UNLOCKS } };
  const first = unlockVisionModeFromCredits(initial, 'nightVision', now);

  assert.equal(first.ok, true);
  assert.equal(first.state.creditCents, 75 - VISION_MODE_PRICE);
  assert.equal(first.state.visionUnlocks.nightVision, now + VISION_UNLOCK_DURATION_MS);

  const retry = unlockVisionModeFromCredits(first.state, 'nightVision', now + 1_000);
  assert.equal(retry.ok, true);
  assert.equal(retry.message, 'Bu görüş modu zaten açık.');
  assert.equal(retry.state.creditCents, first.state.creditCents);
  assert.equal(retry.state.visionUnlocks.nightVision, first.state.visionUnlocks.nightVision);
});

test('vision credit unlock rejects insufficient funds without changing state', () => {
  const now = 1_700_000_000_000;
  const initial = { creditCents: VISION_MODE_PRICE - 1, visionUnlocks: { ...DEFAULT_VISION_UNLOCKS } };
  const result = unlockVisionModeFromCredits(initial, 'thermal', now);

  assert.equal(result.ok, false);
  assert.equal(result.state.creditCents, initial.creditCents);
  assert.equal(result.state.visionUnlocks.thermal, 0);
});