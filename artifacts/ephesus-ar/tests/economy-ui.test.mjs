import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GATE_UNITS,
  REWARDED_AD_VALUE_CENTS,
  VIP_PRICE_USD_CENTS,
  economyText,
  formatUsdFromCents,
  localDayKey,
} from '../lib/economy-ui.ts';
import { SUPPORTED_LOCALES } from '../lib/i18n.ts';

test('UI economy rate displays the exact simulation contract', () => {
  assert.equal(REWARDED_AD_VALUE_CENTS, 50);
  assert.equal(GATE_UNITS, 3);
  assert.equal(VIP_PRICE_USD_CENTS, 999);
  assert.equal(formatUsdFromCents(50, 'en'), '$0.50');
  assert.equal(formatUsdFromCents(150, 'en'), '$1.50');
  assert.equal(formatUsdFromCents(499, 'en'), '$4.99');
  assert.equal(formatUsdFromCents(999, 'en'), '$9.99');
});

test('new economy copy does not expose old dollars or always-unlocked claims', () => {
  for (const locale of SUPPORTED_LOCALES) {
    assert.match(economyText(locale, 'economyVip'), /\$9\.99/);
    assert.doesNotMatch(`${economyText(locale, 'economyVip')} ${economyText(locale, 'economyAdValue')}`, /TRY|TL|kuruş|kurus|кuruş/i);
    assert.doesNotMatch(economyText(locale, 'economyUnlock'), /all weapons unlocked|tüm silahlar açık/i);
  }
});

test('solo gate day keys use the local calendar rather than UTC', () => {
  const local = new Date(2025, 0, 2, 0, 15);
  assert.equal(localDayKey(local), '2025-01-02');
});