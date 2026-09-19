import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATTLE_ENTRY_RETRY_DELAYS_MS,
  retryBattleEntry,
  shouldRetryBattleEntry,
} from '../lib/battle-entry-retry.ts';

test('retries transport, timeout, server and initializing failures only', () => {
  assert.equal(shouldRetryBattleEntry(new Error('Network request failed')), true);
  assert.equal(shouldRetryBattleEntry(new Error('request timed out')), true);
  assert.equal(shouldRetryBattleEntry({
    name: 'ApiConnectionError',
    message: 'API_CONNECTION: POST https://example.test/api/battle/rooms',
    originalError: new TypeError('Network request failed'),
  }), true);
  assert.equal(shouldRetryBattleEntry({
    name: 'ApiConnectionError',
    message: 'API_CONNECTION: POST https://example.test/api/battle/rooms',
    originalError: { name: 'AbortError', message: 'The operation was aborted.' },
  }), true);
  assert.equal(shouldRetryBattleEntry({
    message: 'API_CONNECTION: POST https://example.test/api/battle/rooms',
    originalError: { code: 'ETIMEDOUT', message: 'socket timeout' },
  }), true);
  assert.equal(shouldRetryBattleEntry({ status: 503 }), true);
  assert.equal(shouldRetryBattleEntry({ status: 500, data: { error: 'SERVER_INITIALIZING' } }), true);
  assert.equal(shouldRetryBattleEntry({ data: { error: 'STORE_NOT_READY' } }), true);
});

test('does not retry semantic client errors', () => {
  assert.equal(shouldRetryBattleEntry({ status: 400, data: { error: 'INVALID_REQUEST' } }), false);
  assert.equal(shouldRetryBattleEntry({ status: 404, data: { error: 'ROOM_NOT_FOUND' } }), false);
  assert.equal(shouldRetryBattleEntry({ status: 409, data: { error: 'ROOM_FULL' } }), false);
  assert.equal(shouldRetryBattleEntry({ status: 401, data: { error: 'SESSION_EXPIRED' } }), false);
  assert.equal(shouldRetryBattleEntry({
    status: 400,
    data: { error: 'ROOM_FULL' },
    originalError: new TypeError('Network request failed'),
  }), false);
});

test('uses 700ms and 1500ms delays and stops after two retries', async () => {
  const attempts = [];
  const delays = [];
  await assert.rejects(
    retryBattleEntry(
      async () => {
        attempts.push(attempts.length + 1);
        throw new Error('Failed to fetch');
      },
      {
        sleep: async (delayMs) => delays.push(delayMs),
      },
    ),
    /Failed to fetch/,
  );
  assert.deepEqual(delays, [...BATTLE_ENTRY_RETRY_DELAYS_MS]);
  assert.equal(attempts.length, 3);
});

test('cancellation prevents another attempt after an unmount', async () => {
  let cancelled = false;
  let attempts = 0;
  await assert.rejects(
    retryBattleEntry(
      async () => {
        attempts += 1;
        throw new Error('timeout');
      },
      {
        isCancelled: () => cancelled,
        sleep: async () => {
          cancelled = true;
        },
      },
    ),
    /BATTLE_ENTRY_CANCELLED/,
  );
  assert.equal(attempts, 1);
});