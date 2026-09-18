import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIMULATED_AD_REWARD_CENTS,
  CENTS_PER_LEGACY_CREDIT,
  DEFAULT_CREDIT_CENTS,
  GENERIC_ACTION_COST_CENTS,
  PRO_WEAPON_UNLOCK_COST_CENTS,
  migrateCreditCents,
  migrateLegacyWeaponUnlocks,
  migrateUnlockedWeaponIds,
  isWeaponUnlocked,
  spendCents,
  unlockWeaponFromAd,
  unlockWeaponWithCredits,
  beginAction,
  recordAdClick,
  commitAction,
  cancelAction,
  normalizeEconomyState,
  restorePendingActions,
} from '../lib/economy.ts';
import { isFreeWeapon } from '../lib/weapons.ts';

test('legacy balance migrates to explicit cents without inventing extra balance', () => {
  assert.equal(migrateCreditCents({ credits: 7 }), 7 * CENTS_PER_LEGACY_CREDIT);
  assert.equal(migrateCreditCents({ creditCents: 13, credits: 7 }), 13);
  assert.equal(migrateCreditCents({ credits: -4 }), 0);
});

test('restoring a persisted pending action cancels and refunds its reservation once', () => {
  const started = beginAction(
    { creditCents: 125, unlockedWeapons: [] },
    'teamEntry',
    { transactionId: 'reload-pending', matchId: 'match-1', now: 1_700_000_000_000 },
  );
  assert.equal(started.state.creditCents, 25);
  const persisted = JSON.parse(JSON.stringify(started.state));
  const restored = restorePendingActions(normalizeEconomyState(persisted));
  assert.equal(restored.creditCents, 125);
  assert.deepEqual(restored.pendingActions, {});
  assert.equal(restored.cancelledActions?.['reload-pending']?.reservedKurus, 100);
  assert.equal(restorePendingActions(restored).creditCents, 125);
});

test('legacy Pro weapon ids migrate to one bounded expiry and array fallback is not permanent', () => {
  const now = 1_700_000_000_000;
  const unlocks = migrateLegacyWeaponUnlocks(['ak-74'], undefined, now);
  assert.equal(unlocks['ak-47'], now + 24 * 60 * 60 * 1_000);
  assert.equal(isWeaponUnlocked('ak-47', ['ak-47'], now, unlocks), true);
  assert.equal(isWeaponUnlocked('ak-47', ['ak-47'], now + 24 * 60 * 60 * 1_000, unlocks), false);
  assert.equal(isWeaponUnlocked('ak-47', ['ak-47'], now), false);
});

test('USD cents debit is arithmetic and atomic on insufficient balance', () => {
  assert.equal(SIMULATED_AD_REWARD_CENTS, 50);
  assert.equal(DEFAULT_CREDIT_CENTS, 120);
  const initial = { creditCents: 75, unlockedWeapons: [] };
  const spent = spendCents(initial, GENERIC_ACTION_COST_CENTS);
  assert.equal(spent.ok, true);
  assert.equal(spent.state.creditCents, 25);

  const rejected = spendCents(spent.state, 26);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.state.creditCents, spent.state.creditCents);
});

test('pro weapon ad unlock is individual and idempotent', () => {
  const initial = { creditCents: 20, unlockedWeapons: [] };
  const first = unlockWeaponFromAd(initial, 'awp');
  assert.equal(first.ok, true);
  assert.deepEqual(first.state.unlockedWeapons, ['awp']);
  assert.equal(first.state.creditCents, 20);

  const retry = unlockWeaponFromAd(first.state, 'awp');
  assert.equal(retry.ok, true);
  assert.deepEqual(retry.state, first.state);
});

test('pro weapon credit unlock charges one 50-cent unit once', () => {
  const initial = { creditCents: 75, unlockedWeapons: [] };
  const first = unlockWeaponWithCredits(initial, 'knife');
  assert.equal(first.ok, true);
  assert.equal(first.state.creditCents, 75 - PRO_WEAPON_UNLOCK_COST_CENTS);

  const retry = unlockWeaponWithCredits(first.state, 'knife');
  assert.equal(retry.ok, true);
  assert.equal(retry.state.creditCents, first.state.creditCents);
});

test('gate reserves complete 50-cent units and only leaves the fractional remainder', () => {
  const initial = { creditCents: 125, unlockedWeapons: [] };
  const started = beginAction(initial, 'soloEntry', { now: 1_700_000_000_000, transactionId: 'solo-1' });
  assert.equal(started.requiredAds, 1);
  assert.equal(started.totalRequiredAds, 3);
  assert.equal(started.remainingAds, 1);
  assert.equal(started.reservedKurus, 100);
  assert.equal(started.state.creditCents, 25);

  const clicked = recordAdClick(started.state, 'solo-1');
  assert.equal(clicked.completed, true);
  assert.equal(clicked.state.soloAccessDay, undefined);
  const committed = commitAction(clicked.state, 'solo-1', 1_700_000_000_000);
  assert.equal(committed.ok, true);
  assert.equal(committed.state.creditCents, 25);
  assert.equal(committed.state.soloAccessDay, '2023-11-14');
  const duplicateCommit = commitAction(committed.state, 'solo-1', 1_700_000_000_001);
  assert.equal(duplicateCommit.ok, true);
  assert.strictEqual(duplicateCommit.state, committed.state);
});

test('double begin with an idempotency key never reserves twice', () => {
  const initial = { creditCents: 200, unlockedWeapons: [] };
  const first = beginAction(initial, 'teamEntry', { transactionId: 'same' });
  const retry = beginAction(first.state, 'teamEntry', { transactionId: 'same' });
  assert.strictEqual(retry.state, first.state);
  assert.equal(retry.state.creditCents, 50);
  assert.equal(first.requiredAds, 0);
  assert.equal(first.remainingAds, 0);
  assert.equal(first.transaction.completedAds, 0);
});

test('cancel and failed action preserve the reserved balance', () => {
  const initial = { creditCents: 125, unlockedWeapons: [] };
  const started = beginAction(initial, 'teamEntry', { transactionId: 'cancel' });
  assert.equal(started.state.creditCents, 25);
  const cancelled = cancelAction(started.state, 'cancel');
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.state.creditCents, 125);
  assert.deepEqual(cancelled.state.pendingActions, {});
});

test('VIP bypass has no debit and does not accept simulated ad progress', () => {
  const initial = { creditCents: 25, unlockedWeapons: [] };
  const started = beginAction(initial, 'thermal', { transactionId: 'vip', vip: true });
  assert.equal(started.requiredAds, 0);
  assert.equal(started.remainingAds, 0);
  assert.equal(started.state.creditCents, 25);
  const clicked = recordAdClick(started.state, 'vip');
  assert.equal(clicked.progress, 0);
  const committed = commitAction(clicked.state, 'vip', 1_700_000_000_000);
  assert.equal(committed.ok, true);
  assert.equal(committed.state.creditCents, 25);
});

test('an expired VIP pending gate cannot grant after entitlement expiry', () => {
  const now = 1_700_000_000_000;
  const started = beginAction(
    { creditCents: 25, unlockedWeapons: [] },
    'soloEntry',
    { transactionId: 'expiring-vip', vip: true, vipExpiresAt: now + 1, now },
  );
  assert.equal(started.requiredAds, 0);
  const expired = commitAction(started.state, 'expiring-vip', now + 1);
  assert.equal(expired.ok, false);
  assert.equal(expired.state.creditCents, 25);
});

test('weapon gate grants one exact 24-hour unlock only after the final click', () => {
  const now = 1_700_000_000_000;
  const started = beginAction(
    { creditCents: 0, unlockedWeapons: [] },
    { type: 'weapon', weaponId: 'awp' },
    { transactionId: 'weapon', now },
  );
  assert.equal(started.remainingAds, 1);
  const beforeCommit = recordAdClick(started.state, 'weapon');
  assert.deepEqual(beforeCommit.state.unlockedWeapons, []);
  const committed = commitAction(beforeCommit.state, 'weapon', now);
  assert.equal(committed.state.weaponUnlocks.awp, now + 24 * 60 * 60 * 1000);
  assert.deepEqual(committed.state.unlockedWeapons, ['awp']);
});

test('solo access is once per local calendar day and team gates are per match', () => {
  const morning = new Date(2024, 4, 10, 9).getTime();
  const nextDay = new Date(2024, 4, 11, 9).getTime();
  const soloStart = beginAction(
    { creditCents: 0, unlockedWeapons: [] },
    'soloEntry',
    { transactionId: 'solo-day-1', now: morning },
  );
  let soloState = soloStart.state;
  for (let i = 0; i < 3; i += 1) soloState = recordAdClick(soloState, 'solo-day-1').state;
  soloState = commitAction(soloState, 'solo-day-1', morning).state;
  const sameDay = beginAction(soloState, 'soloEntry', { transactionId: 'solo-same-day', now: morning + 1_000 });
  assert.equal(sameDay.requiredAds, 0);
  const nextDayAction = beginAction(soloState, 'soloEntry', { transactionId: 'solo-next-day', now: nextDay });
  assert.equal(nextDayAction.requiredAds, 3);

  const team = beginAction(
    { creditCents: 0, unlockedWeapons: [] },
    'teamEntry',
    { transactionId: 'match-a', matchId: 'match-a', now: morning },
  );
  let teamState = team.state;
  for (let i = 0; i < 3; i += 1) teamState = recordAdClick(teamState, 'match-a').state;
  teamState = commitAction(teamState, 'match-a', morning).state;
  assert.equal(beginAction(teamState, 'teamEntry', { transactionId: 'retry-a', matchId: 'match-a', now: morning }).requiredAds, 0);
  assert.equal(beginAction(teamState, 'teamEntry', { transactionId: 'new-b', matchId: 'match-b', now: morning }).requiredAds, 3);
});

test('pending reservations and expiry metadata survive economy normalization', () => {
  const stored = normalizeEconomyState({
    creditKurus: 25,
    unlockedWeapons: ['awp'],
    weaponUnlocks: { awp: 1_800_000_000_000 },
    pendingActions: {
      pending: {
        id: 'pending',
        action: 'ammoRefill',
        requiredAds: 1,
        completedAds: 0,
        reservedKurus: 0,
        startedAt: 1_700_000_000_000,
        vip: false,
      },
    },
  });
  assert.equal(stored.creditCents, 25);
  assert.equal(stored.weaponUnlocks.awp, 1_800_000_000_000);
  assert.equal(stored.pendingActions.pending.remainingAds, 1);
});

test('weapon unlock migration maps legacy ids and never stores free weapons', () => {
  assert.deepEqual(migrateUnlockedWeaponIds(['sniper', 'field-knife', 'glock-17', 'sniper']), ['awp', 'knife']);
});

test('only pistols and submachineguns are free starters', () => {
  assert.equal(isFreeWeapon('glock-17'), true);
  assert.equal(isFreeWeapon('mp5'), true);
  assert.equal(isFreeWeapon('m4a1'), false);
  assert.equal(isFreeWeapon('remington-870'), false);
  assert.equal(isFreeWeapon('knife'), false);
});