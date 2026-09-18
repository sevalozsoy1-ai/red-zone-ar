import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_LABELS,
  SUPPORTED_LOCALES,
  TRANSLATIONS,
  WEAPON_ACTION_KEYS,
  uiText,
  weaponActionLabel,
} from '../lib/i18n.ts';

test('every supported locale contains the complete translation key set', () => {
  const expected = Object.keys(TRANSLATIONS.en).sort();
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(
      Object.keys(TRANSLATIONS[locale]).sort(),
      expected,
      `${locale} translation keys must match English`,
    );
  }
});

test('knife throw action is translated in Turkish and English', () => {
  assert.equal(weaponActionLabel('tr', 'knifeThrow'), 'BIÇAK FIRLATMA');
  assert.equal(weaponActionLabel('en', 'knifeThrow'), 'KNIFE THROW');
});

test('weapon action auxiliary dictionaries have complete parity', () => {
  const expected = [...WEAPON_ACTION_KEYS].sort();
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(
      Object.keys(ACTION_LABELS[locale]).sort(),
      expected,
      `${locale} weapon action labels must match English`,
    );
  }
});

test('winner terminal copy is localized for every supported locale', () => {
  assert.equal(uiText('tr', 'winner'), 'Kazanan');
  assert.equal(uiText('en', 'winner'), 'Winner');
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(uiText(locale, 'winner').trim(), `${locale} winner copy must not be empty`);
  }
});