import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AudioReadinessError,
  assertAudioOutputAvailable,
  waitForAudioPlayerReady,
  waitForAnyAudioPlayerReady,
  waitForRunningAudioContext,
} from '../lib/audio-readiness.ts';
import { createAudioSessionQueue } from '../lib/audio-session-queue.ts';

function fakePlayer() {
  const listeners = new Set();
  return {
    isLoaded: false,
    currentStatus: { isLoaded: false, error: null },
    addListener(_event, listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    emit(status) {
      this.currentStatus = status;
      this.isLoaded = status.isLoaded === true;
      for (const listener of listeners) listener(status);
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

test('waitForAudioPlayerReady queues completion until a player reports loaded', async () => {
  const player = fakePlayer();
  let settled = false;
  const ready = waitForAudioPlayerReady(player, 100);
  ready.then(() => { settled = true; });

  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(settled, false);
  player.emit({ isLoaded: true, error: null });
  await ready;
  assert.equal(settled, true);
  assert.equal(player.listenerCount, 0);
});

test('waitForAudioPlayerReady closes the load/listener registration race', async () => {
  const player = fakePlayer();
  const originalAddListener = player.addListener;
  player.addListener = (event, listener) => {
    const subscription = originalAddListener.call(player, event, listener);
    // Simulate native finishing immediately after listener registration
    // without emitting a second status event.
    player.currentStatus = { isLoaded: true, error: null };
    player.isLoaded = true;
    return subscription;
  };

  await waitForAudioPlayerReady(player, 100);
  assert.equal(player.listenerCount, 0);
});

test('waitForAudioPlayerReady surfaces native load errors and removes its listener', async () => {
  const player = fakePlayer();
  const ready = waitForAudioPlayerReady(player, 100);
  player.emit({ isLoaded: false, error: 'decode failed' });

  await assert.rejects(ready, (error) => {
    assert.ok(error instanceof AudioReadinessError);
    assert.equal(error.reason, 'load-failed');
    return true;
  });
  assert.equal(player.listenerCount, 0);
});

test('waitForAudioPlayerReady fails instead of waiting forever', async () => {
  const player = fakePlayer();
  await assert.rejects(waitForAudioPlayerReady(player, 1), (error) => {
    assert.ok(error instanceof AudioReadinessError);
    assert.equal(error.reason, 'timeout');
    return true;
  });
  assert.equal(player.listenerCount, 0);
});

test('waitForAnyAudioPlayerReady uses the first decoded pool copy', async () => {
  const first = fakePlayer();
  const second = fakePlayer();
  const ready = waitForAnyAudioPlayerReady([first, second], 100);
  second.emit({ isLoaded: true, error: null });
  await ready;
  assert.equal(second.isLoaded, true);
});

test('web audio readiness verifies a running context and an output channel', async () => {
  const context = {
    state: 'suspended',
    async resume() {
      this.state = 'running';
    },
  };
  await waitForRunningAudioContext(context);
  assertAudioOutputAvailable({ destination: { maxChannelCount: 2 } });
  await assert.rejects(
    waitForRunningAudioContext({
      state: 'suspended',
      async resume() {},
    }),
    (error) => error instanceof AudioReadinessError && error.reason === 'context-not-running',
  );
  assert.throws(
    () => assertAudioOutputAvailable({ destination: { maxChannelCount: 0 } }),
    (error) => error instanceof AudioReadinessError && error.reason === 'output-unavailable',
  );
});

test('shared audio-session queue serializes mutations and recovers after rejection', async () => {
  const queue = createAudioSessionQueue();
  const order = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });

  const first = queue.enqueue(async () => {
    order.push('first-start');
    await firstGate;
    order.push('first-end');
  });
  const second = queue.enqueue(async () => {
    order.push('second');
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(order, ['first-start']);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first-start', 'first-end', 'second']);

  await assert.rejects(queue.enqueue(async () => {
    throw new Error('native session failed');
  }));
  await queue.enqueue(async () => {
    order.push('after-failure');
  });
  assert.equal(order.at(-1), 'after-failure');
});

// Readiness failures must remain observable to callers.
