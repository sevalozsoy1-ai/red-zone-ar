import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAudioPoolCoordinator,
  findLeastRecentlyUsedEvictableAudioPool,
} from '../lib/audio-pool-coordinator.ts';

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

test('mixed sound burst retains queued pools during delayed loads and trims after playback', async () => {
  const sounds = ['weapon', 'reload', 'enemy-rifle', 'enemy-heavy'].map((key, index) => ({
    key,
    recency: index + 1,
    busy: false,
    playing: false,
    loading: true,
    queued: true,
    pendingRequest: true,
  }));
  const deferredLoads = sounds.map(() => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
  });
  const settledLoads = deferredLoads.map((load, index) => load.promise.then(() => {
    sounds[index].loading = false;
  }));

  // Four distinct sounds arrive while all source files are still loading.
  assert.equal(findLeastRecentlyUsedEvictableAudioPool(sounds), null);
  deferredLoads.forEach((load) => load.resolve());
  await Promise.all(settledLoads);

  // A resolved preload is still protected until its deferred shot transfers
  // from the request queue to an active player lease.
  assert.equal(findLeastRecentlyUsedEvictableAudioPool(sounds), null);
  sounds.forEach((sound) => {
    sound.queued = false;
    // A shot may still be waiting for session activation before it can lease
    // a player, even though this particular pool's asset is ready.
    sound.pendingRequest = true;
  });
  assert.equal(findLeastRecentlyUsedEvictableAudioPool(sounds), null);
  sounds.forEach((sound) => {
    sound.pendingRequest = false;
    sound.busy = true;
  });
  assert.equal(findLeastRecentlyUsedEvictableAudioPool(sounds), null);

  // Once playback and leases settle, normal LRU trimming can resume.
  sounds.forEach((sound) => { sound.busy = false; });
  assert.equal(findLeastRecentlyUsedEvictableAudioPool(sounds), 'weapon');
});