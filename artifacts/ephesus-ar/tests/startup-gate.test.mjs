import test from 'node:test';
import assert from 'node:assert/strict';
import { canLeaveBoot, shouldApplyDevicePreferences } from '../lib/startup-gate.ts';

test('returning onboarded users still apply device preferences', () => {
  assert.equal(shouldApplyDevicePreferences(true, false, false), true);
});

test('boot can leave only after preferences apply or external camera mode', () => {
  assert.equal(canLeaveBoot(true, false, false), false);
  assert.equal(canLeaveBoot(true, true, false), true);
  assert.equal(canLeaveBoot(false, false, true), false);
  assert.equal(canLeaveBoot(true, false, true), true);
});

test('fresh launch keeps the boot timer gated until async preferences settle', () => {
  // The boot screen must not start a one-shot completion timer while the
  // preference read is still pending: if it fires early, a later re-render
  // can leave a fresh launch permanently on INITIALIZING.
  const preferenceReadPending = canLeaveBoot(true, false, false);
  const preferenceReadSettled = canLeaveBoot(true, true, false);
  assert.equal(preferenceReadPending, false);
  assert.equal(preferenceReadSettled, true);
});