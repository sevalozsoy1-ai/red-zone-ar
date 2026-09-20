import test from 'node:test';
import assert from 'node:assert/strict';
import {
  battleHudStatus,
  getMarkerTarget,
  getNetworkTarget,
  isBattleCombatDisabled,
  isGoneBattleSession,
  releaseBattleShot,
  shouldApplyBattleSnapshot,
  tryAcquireBattleShot,
} from '../lib/battle-ui.ts';
import {
  handleBattleAppStateChange,
  handleBattleHardwareBack,
} from '../lib/battle-session-lifecycle.ts';

const activeCombat = {
  hasBattleSession: true,
  roomStatus: 'active',
  roomError: false,
  cameraLive: true,
  ownPlayerAlive: true,
  adOpen: false,
  reloading: false,
};

test('finished and unavailable rooms disable every combat control', () => {
  assert.equal(isBattleCombatDisabled({ ...activeCombat, roomStatus: 'finished' }), true);
  assert.equal(isBattleCombatDisabled({ ...activeCombat, roomError: true }), true);
  assert.equal(isBattleCombatDisabled({ ...activeCombat, cameraLive: false }), true);
  assert.equal(isBattleCombatDisabled(activeCombat), false);
});

test('camera marker target stays valid while presence heartbeat catches up', () => {
  const players = [
    { id: 'self', alive: true, connected: true, markerId: 1 },
    { id: 'target', alive: true, connected: false, markerId: 4 },
    { id: 'dead', alive: false, connected: true, markerId: 5 },
  ];

  assert.equal(getMarkerTarget(players, 'self', 4)?.id, 'target');
  assert.equal(getMarkerTarget(players, 'self', 1), null);
  assert.equal(getMarkerTarget(players, 'self', 5), null);
  assert.equal(getMarkerTarget(players, 'self', null), null);
});

test('knife throw draw lock blocks controls while the active battle is otherwise ready', () => {
  assert.equal(isBattleCombatDisabled({ ...activeCombat, actionLocked: true }), true);
  assert.equal(isBattleCombatDisabled({ ...activeCombat, actionLocked: false }), false);
});

test('network targeting selects the active connected room opponent without camera filtering', () => {
  const players = [
    { id: 'self', alive: true, connected: true, markerId: 0 },
    { id: 'dead', alive: false, connected: true, markerId: 1 },
    { id: 'away', alive: true, connected: false, markerId: 2 },
    { id: 'live', alive: true, connected: true, markerId: 3 },
  ];
  const selected = getNetworkTarget(players, 'self');
  assert.equal(selected.target?.id, 'live');
  assert.equal(selected.reason, null);
  assert.equal(getNetworkTarget(players.slice(0, 3), 'self').reason, 'NO_TARGET');
  assert.equal(getNetworkTarget([players[0], players[2]], 'self').reason, 'NO_OPPONENT');
});

test('authoritative room cache never regresses to an older combat snapshot', () => {
  assert.equal(shouldApplyBattleSnapshot({ updatedAt: 12 }, { updatedAt: 13 }), true);
  assert.equal(shouldApplyBattleSnapshot({ updatedAt: 13 }, { updatedAt: 13 }), true);
  assert.equal(shouldApplyBattleSnapshot({ updatedAt: 14 }, { updatedAt: 13 }), false);
  assert.equal(shouldApplyBattleSnapshot(undefined, { updatedAt: 1 }), true);
  assert.equal(shouldApplyBattleSnapshot({ updatedAt: 1 }, {}), false);
});

test('finished and error HUD states never fall back to waiting', () => {
  assert.equal(battleHudStatus({ hasBattleSession: true, roomStatus: 'finished', roomError: false, hasActiveOpponent: false }), 'finished');
  assert.equal(battleHudStatus({ hasBattleSession: true, roomStatus: 'active', roomError: true, hasActiveOpponent: false }), 'error');
  assert.equal(battleHudStatus({ hasBattleSession: true, roomStatus: 'active', roomError: false, hasActiveOpponent: false }), 'waiting');
  assert.equal(battleHudStatus({ hasBattleSession: true, roomStatus: 'active', roomError: false, cameraLive: false, hasActiveOpponent: true }), 'camera');
  assert.equal(battleHudStatus({ hasBattleSession: true, roomStatus: 'active', roomError: false, hasActiveOpponent: true }), 'ready');
});

test('missing leave sessions may safely exit while transport errors remain visible', () => {
  assert.equal(isGoneBattleSession({ status: 404 }), true);
  assert.equal(isGoneBattleSession({ status: 410 }), true);
  assert.equal(isGoneBattleSession({ status: 401 }), true);
  assert.equal(isGoneBattleSession({ status: 400, data: { error: 'SESSION_EXPIRED' } }), true);
  assert.equal(isGoneBattleSession({ status: 503 }), false);
  assert.equal(isGoneBattleSession({ status: 400, data: { error: 'INVALID_REQUEST' } }), false);
  assert.equal(isGoneBattleSession(new Error('network')), false);
});

test('shot mutation gate rejects RAF overlap until the request settles', () => {
  const inFlight = { current: false };
  assert.equal(tryAcquireBattleShot(inFlight), true);
  assert.equal(tryAcquireBattleShot(inFlight), false);
  releaseBattleShot(inFlight);
  assert.equal(tryAcquireBattleShot(inFlight), true);
});

test('background app state pauses and cancels the exact authenticated room query', async () => {
  const queryKey = ['/api/battle/rooms/ABC123', 'session-token'];
  const cancelled = [];
  let active = true;
  let refreshed = 0;
  let stopped = 0;

  handleBattleAppStateChange('background', {
    hasSession: true,
    queryKey,
    setAppActive: (nextActive) => { active = nextActive; },
    cancelQueries: (filters) => { cancelled.push(filters); },
    refetch: () => { refreshed += 1; return Promise.resolve({}); },
    onBackground: () => { stopped += 1; },
  });
  await Promise.resolve();

  assert.equal(active, false);
  assert.equal(stopped, 1);
  assert.equal(refreshed, 0);
  assert.deepEqual(cancelled, [{ queryKey, exact: true }]);
});

test('foreground app state refreshes immediately and surfaces an expired session', async () => {
  const queryKey = ['/api/battle/rooms/ABC123', 'session-token'];
  let active = false;
  let refreshed = 0;
  let refetchOptions;
  const expired = [];

  handleBattleAppStateChange('active', {
    hasSession: true,
    queryKey,
    setAppActive: (nextActive) => { active = nextActive; },
    cancelQueries: () => undefined,
    refetch: async (options) => {
      refreshed += 1;
      refetchOptions = options;
      return { error: { status: 410, data: { error: 'SESSION_EXPIRED' } } };
    },
    isExpiredError: isGoneBattleSession,
    onExpired: (error) => { expired.push(error); },
  });
  await Promise.resolve();

  assert.equal(active, true);
  assert.equal(refreshed, 1);
  assert.deepEqual(refetchOptions, { cancelRefetch: false });
  assert.deepEqual(expired, [{ status: 410, data: { error: 'SESSION_EXPIRED' } }]);
});

test('Android back confirmation leaves cancelable and confirms explicit exit', () => {
  let alert;
  let left = 0;
  let exited = 0;
  const result = handleBattleHardwareBack({
    hasSession: true,
    onExit: () => { exited += 1; },
    onLeave: () => { left += 1; },
    confirmLeave: (confirmation) => { alert = confirmation; },
  });

  assert.equal(result, true);
  assert.equal(left, 0);
  assert.equal(exited, 0);
  alert.onCancel();
  assert.equal(left, 0);
  alert.onConfirm();
  assert.equal(left, 1);
  assert.equal(exited, 0);
});