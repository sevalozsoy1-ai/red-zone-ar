import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  isCurrentAudioPlaybackRequest,
  waitForAudioPlaybackProgress,
} from '../lib/audio-playback-confirmation.ts';
import { audioInterruptionModeForPlatform } from '../lib/audio-session-mode.ts';

const hookSource = await readFile(
  new URL('../hooks/useWeaponAudio.ts', import.meta.url),
  'utf8',
);

test('native weapon replay pauses before seeking on Android', () => {
  const pause = hookSource.indexOf('player.pause();');
  const seek = hookSource.indexOf('player.seekTo(0)');

  assert.notEqual(pause, -1, 'replay must pause the native player first');
  assert.notEqual(seek, -1, 'replay must seek to the start');
  assert.ok(
    pause < seek,
    'Android MediaPlayer must leave PLAYING before seekTo is called',
  );
});

test('sustained fire does not enqueue native session activation per shot', () => {
  const playbackStart = hookSource.indexOf('const sessionAtRequest = sessionReady.current;');
  const playbackEnd = hookSource.indexOf('const playShot =', playbackStart);

  assert.notEqual(playbackStart, -1, 'shot playback waits for shared session readiness');
  assert.notEqual(playbackEnd, -1, 'shot playback chain has a completion step');
  assert.equal(
    hookSource.slice(playbackStart, playbackEnd).includes('activateNativeAudioSession()'),
    false,
    'normal shots must not enqueue process-wide session activation',
  );
});

test('the manual sound retry replaces a rejected session activation', () => {
  const retry = hookSource.split('const playTestSound = useCallback')[1]?.split('const prepareWeapon')[0];
  assert.ok(retry);
  assert.match(retry, /sessionReady\.current = activateNativeAudioSession\(\)/);
  assert.match(retry, /disposePool\(id\)/);
});

test('a rejected session can recover automatically without a manual sound-test tap', () => {
  assert.match(hookSource, /const recoverNativeAudioSession = useCallback/);
  assert.match(hookSource, /const sessionAtRequest = sessionReady\.current;/);
  assert.match(hookSource, /recoverNativeAudioSession\(\)\s*\.then\(\(\) => playWhenReady\(\)\)/);
});

test('playing, loading, queued, and leased pools are protected from LRU eviction', () => {
  assert.match(hookSource, /busy: pool\.coordinator\.busyCount > 0,/);
  assert.match(hookSource, /playing: pool\.players\.some\(\(player\) => player\.currentStatus\.playing\),/);
  assert.match(hookSource, /loading: !pool\.readySettled,/);
  assert.match(hookSource, /queued: queuedRequests\.current\.has\(key\),/);
  assert.match(hookSource, /pendingRequest: pool\.pendingRequests > 0,/);
  assert.match(hookSource, /created\.ready = waitForAnyAudioPlayerReady\(players\)\.then/);
  assert.match(hookSource, /playbackStatusUpdate',\s*\(\) => trimIdlePools\(key\)/);
  assert.match(hookSource, /pool\.subscriptions\.forEach\(\(subscription\) =>/);
});

test('Android reacquires audio focus while iOS keeps its existing mix behavior', () => {
  assert.equal(audioInterruptionModeForPlatform('android'), 'doNotMix');
  assert.equal(audioInterruptionModeForPlatform('ios'), 'mixWithOthers');
  assert.equal(audioInterruptionModeForPlatform('web'), 'mixWithOthers');
});

test('the fire path waits for playback progress rather than trusting play()', () => {
  assert.match(hookSource, /updateInterval:\s*100/);
  assert.match(hookSource, /const playbackProgress = waitForAudioPlaybackProgress\(player\)/);
  assert.match(hookSource, /if \(!progressed\) \{\s*throw new Error\('Audio player did not report playback progress'\)/);
});

test('an exhausted rebuilt-pool retry reports failure only for the current request', () => {
  const initialPool = {};
  const retryPool = {};
  let attemptedPool = initialPool;
  let currentPool = initialPool;
  const currentRequest = {
    mounted: true,
    active: true,
    requestIsCurrent: true,
    lifecycleIsCurrent: true,
    enemyIsCurrent: true,
    selectedWeaponIsCurrent: true,
    pool: attemptedPool,
    currentPool,
  };

  // First failure replaces the pool; only the retry's failure should be
  // reported, using the replacement pool rather than the disposed original.
  currentPool = retryPool;
  assert.equal(isCurrentAudioPlaybackRequest({ ...currentRequest, pool: attemptedPool, currentPool }), false);
  attemptedPool = retryPool;
  assert.equal(isCurrentAudioPlaybackRequest({ ...currentRequest, pool: attemptedPool, currentPool }), true);
  assert.match(hookSource, /attemptedPool = targetPool/);
  assert.match(hookSource, /if \(!isCurrentRequestForPool\(attemptedPool\)\) return;/);
  assert.match(hookSource, /setError\('Ses oynatılamadı\. Cihaz sesini açıp SESİ DENE düğmesine tekrar basın\.'\)/);

  assert.equal(
    isCurrentAudioPlaybackRequest({ ...currentRequest, pool: attemptedPool, currentPool: undefined }),
    false,
    'disposing/replacing the failed pool makes the result stale',
  );
  assert.equal(
    isCurrentAudioPlaybackRequest({ ...currentRequest, pool: attemptedPool, currentPool, selectedWeaponIsCurrent: false }),
    false,
    'changing weapons suppresses an old playback error',
  );
  assert.equal(
    isCurrentAudioPlaybackRequest({ ...currentRequest, pool: attemptedPool, currentPool, requestIsCurrent: false }),
    false,
    'a newer request suppresses an older playback error',
  );
});

test('playback confirmation resolves only after native position advances', async () => {
  const listeners = new Set();
  const player = {
    currentStatus: { currentTime: 0, didJustFinish: false },
    addListener(_event, listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    emit(status) {
      this.currentStatus = status;
      for (const listener of listeners) listener(status);
    },
  };
  let settled = false;
  const progress = waitForAudioPlaybackProgress(player, 50).then((result) => {
    settled = true;
    return result;
  });

  await new Promise((resolve) => setTimeout(resolve, 1));
  assert.equal(settled, false, 'a play request by itself is not playback evidence');
  player.emit({ currentTime: 0.12, didJustFinish: false });
  assert.equal(await progress, true);
  assert.equal(player.currentStatus.currentTime, 0.12);
  assert.equal(listeners.size, 0, 'progress listener must be released after confirmation');
});

test('stalled playback times out and does not reuse an old completion flag', async () => {
  const listeners = new Set();
  const player = {
    currentStatus: { currentTime: 0, didJustFinish: true },
    addListener(_event, listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };

  assert.equal(await waitForAudioPlaybackProgress(player, 10), false);
  assert.equal(listeners.size, 0, 'timeout must remove the native status listener');
});