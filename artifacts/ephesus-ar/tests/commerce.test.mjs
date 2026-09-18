import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDIT_PACKAGES,
  DEFAULT_COMMERCE_LEDGER,
  GOLD_PLAN,
  createCommerceAdapter,
  getCommerceEntitlements,
  simulateCreditPurchase,
  simulateGoldPurchase,
  addCalendarMonthClamped,
} from '../lib/commerce.ts';

function state(overrides = {}) {
  return {
    creditCents: 100,
    unlockedWeapons: [],
    commerce: {
      ...DEFAULT_COMMERCE_LEDGER,
      simulationTransactions: {},
    },
    ...overrides,
  };
}

test('Gold entitlements are complete while active and expire at the boundary', () => {
  const now = 1_700_000_000_000;
  const ledger = {
    ...DEFAULT_COMMERCE_LEDGER,
    goldExpiresAt: now + 1,
    simulationTransactions: {},
  };

  const active = getCommerceEntitlements(ledger, now);
  assert.equal(active.activeGold, true);
  assert.equal(active.allProAccess, true);
  assert.equal(active.adFree, true);
  assert.equal(active.unlimitedAmmo, true);
  assert.equal(active.unlimitedKnife, true);
  assert.equal(active.unlimitedRefills, true);
  assert.equal(active.unlimitedVision, true);

  assert.equal(getCommerceEntitlements(ledger, now + 1).activeGold, false);
  assert.equal(getCommerceEntitlements(ledger, now + 1).allProAccess, false);
});

test('Gold purchase has the declared price/duration and renewal extends from the later endpoint', () => {
  const now = 1_700_000_000_000;
  assert.equal(GOLD_PLAN.priceCents, 999);
  assert.equal(GOLD_PLAN.currency, 'USD');
  assert.equal(GOLD_PLAN.billingPeriod, 'calendar-month');

  const first = simulateGoldPurchase(state(), 'gold-first', now);
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal(first.state.commerce.goldExpiresAt, addCalendarMonthClamped(now));

  const renewalTime = now + 1_000;
  const renewed = simulateGoldPurchase(first.state, 'gold-renewal', renewalTime);
  assert.equal(renewed.ok, true);
  assert.equal(
    renewed.state.commerce.goldExpiresAt,
    addCalendarMonthClamped(first.state.commerce.goldExpiresAt),
  );

  const expiredAt = renewed.state.commerce.goldExpiresAt + 1;
  const restarted = simulateGoldPurchase(renewed.state, 'gold-after-expiry', expiredAt);
  assert.equal(restarted.state.commerce.goldExpiresAt, addCalendarMonthClamped(expiredAt));
});

test('Gold transaction ids and credit top-up ids are idempotent', () => {
  const now = 1_700_000_000_000;
  const firstGold = simulateGoldPurchase(state(), 'same-gold-operation', now);
  const retriedGold = simulateGoldPurchase(firstGold.state, 'same-gold-operation', now + 1);
  assert.equal(retriedGold.ok, true);
  assert.equal(retriedGold.duplicate, true);
  assert.strictEqual(retriedGold.state, firstGold.state);

  const pack = CREDIT_PACKAGES.find((candidate) => candidate.id === 'credits-15-usd');
  assert.ok(pack);
  const firstCredit = simulateCreditPurchase(state(), pack.id, 'same-credit-operation', now);
  assert.equal(firstCredit.ok, true);
  assert.equal(firstCredit.state.creditCents, 100 + pack.creditCents);
  const retriedCredit = simulateCreditPurchase(firstCredit.state, pack.id, 'same-credit-operation', now + 1);
  assert.equal(retriedCredit.ok, true);
  assert.equal(retriedCredit.duplicate, true);
  assert.equal(retriedCredit.state.creditCents, firstCredit.state.creditCents);
  assert.strictEqual(retriedCredit.state, firstCredit.state);

  const conflicting = simulateGoldPurchase(firstCredit.state, 'same-credit-operation', now + 2);
  assert.equal(conflicting.ok, false);
  assert.equal(conflicting.duplicate, true);
  assert.equal(conflicting.state.creditCents, firstCredit.state.creditCents);
});

test('simulated credit-card packages use $4.99/$14.99 prices for $5/$15 credits', () => {
  assert.deepEqual(
    CREDIT_PACKAGES.map((item) => [item.id, item.priceCents, item.creditCents]),
    [
      ['credits-5-usd', 499, 500],
      ['credits-15-usd', 1499, 1500],
    ],
  );
});

test('calendar VIP renewal clamps month ends', () => {
  const january31 = new Date(2024, 0, 31, 12).getTime();
  const february29 = new Date(2024, 1, 29, 12).getTime();
  assert.equal(addCalendarMonthClamped(january31), february29);
});

test('real commerce mode fails closed without a verified provider', () => {
  const adapter = createCommerceAdapter('real');
  const initial = state();
  assert.equal(adapter.mode, 'real');
  assert.equal(adapter.isSimulation, false);

  const gold = adapter.purchaseGold(initial, 'real-gold-placeholder', 1_700_000_000_000);
  assert.equal(gold.ok, false);
  assert.strictEqual(gold.state, initial);
  assert.equal(gold.grantedCents, 0);

  const credits = adapter.purchaseCredits(initial, 'credits-10-usd', 'real-credit-placeholder', 1_700_000_000_000);
  assert.equal(credits.ok, false);
  assert.strictEqual(credits.state, initial);
  assert.equal(credits.grantedCents, 0);

  const ad = adapter.showRewardedAd(false);
  assert.equal(ad.ok, false);
  assert.equal(ad.bypassed, false);
});