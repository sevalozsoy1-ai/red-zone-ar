import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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