import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioPoolCoordinator } from '../lib/audio-pool-coordinator.ts';

test('a player lease is exclusive until its operation completes', () => {
  const pool = createAudioPoolCoordinator(['a']);
  const first = pool.acquire();
  assert.ok(first);
  assert.equal(pool.acquire(), null);
  first.release();
  const second = pool.acquire();
  assert.equal(second?.value, 'a');
  second.release();
});

test('invalidating a replaced pool makes old async work stale', () => {
  const pool = createAudioPoolCoordinator(['a', 'b']);
  const lease = pool.acquire();
  assert.ok(lease);
  const oldGeneration = lease.generation;
  pool.invalidate();
  assert.equal(pool.isCurrent(oldGeneration), false);
  assert.equal(pool.busyCount, 0);
  lease.release();
  assert.ok(pool.acquire());
});

test('bounded pools reject overlap instead of allocating unbounded players', () => {
  const pool = createAudioPoolCoordinator(['a', 'b']);
  const first = pool.acquire();
  const second = pool.acquire();
  assert.ok(first);
  assert.ok(second);
  assert.equal(pool.acquire(), null);
  assert.equal(pool.size, 2);
  first.release();
  second.release();
  assert.equal(pool.busyCount, 0);
});

test('predicate-aware acquire skips an unloaded secondary player', () => {
  const loaded = { loaded: true };
  const loading = { loaded: false };
  const pool = createAudioPoolCoordinator([loading, loaded]);

  const lease = pool.acquire((player) => player.loaded);
  assert.equal(lease?.value, loaded);
  assert.equal(pool.busyCount, 1);
  assert.equal(pool.acquire((player) => player.loaded), null);
  lease.release();
  assert.equal(pool.busyCount, 0);
});