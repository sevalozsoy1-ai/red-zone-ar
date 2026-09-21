import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasSeenTargetTutorial,
  setTargetTutorialSeen,
  resetTargetTutorialSeen,
} from '../lib/tutorial-state.ts';

test('Target tutorial state persistence', async (t) => {
  const map = new Map();
  const mockStorage = {
    getItem: async (k) => map.get(k) || null,
    setItem: async (k, v) => { map.set(k, v); },
    removeItem: async (k) => { map.delete(k); },
  };

  await t.test('initially returns false', async () => {
    map.clear();
    const seen = await hasSeenTargetTutorial(mockStorage);
    assert.equal(seen, false, 'Should be false when not set');
  });

  await t.test('returns true after being set', async () => {
    map.clear();
    await setTargetTutorialSeen(mockStorage);
    const seen = await hasSeenTargetTutorial(mockStorage);
    assert.equal(seen, true, 'Should be true after setTargetTutorialSeen is called');
    assert.equal(map.get('@red_zone_ar_target_tutorial_seen'), 'true');
  });

  await t.test('returns false after being reset', async () => {
    map.set('@red_zone_ar_target_tutorial_seen', 'true');
    await resetTargetTutorialSeen(mockStorage);
    const seen = await hasSeenTargetTutorial(mockStorage);
    assert.equal(seen, false, 'Should be false after resetTargetTutorialSeen is called');
    assert.equal(map.has('@red_zone_ar_target_tutorial_seen'), false);
  });
});
