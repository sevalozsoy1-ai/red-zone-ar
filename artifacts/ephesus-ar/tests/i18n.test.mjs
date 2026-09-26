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

test('camera permission copy exists for every supported locale', () => {
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(uiText(locale, 'cameraPermissionDenied').trim(), `${locale} denied copy must not be empty`);
    assert.ok(uiText(locale, 'cameraUnavailable').trim(), `${locale} unavailable copy must not be empty`);
    assert.ok(uiText(locale, 'cameraUnavailableTitle').trim(), `${locale} unavailable title must not be empty`);
  }
});

test('target setup tutorial copy is native and complete for every locale', () => {
  const keys = [
    'tutorialTitle', 'tutorialStep1', 'tutorialStep2', 'tutorialStep3',
    'tutorialStep4', 'tutorialCameraWarning', 'tutorialSkip', 'tutorialNext',
    'tutorialBack', 'tutorialDone', 'howToPrepare',
  ];
  const english = keys.map((key) => uiText('en', key));
  for (const locale of SUPPORTED_LOCALES) {
    for (const [index, key] of keys.entries()) {
      const value = uiText(locale, key).trim();
      assert.ok(value, `${locale} ${key} copy must not be empty`);
      if (locale !== 'en') assert.notEqual(value, english[index], `${locale} ${key} must be translated`);
    }
  }
});

test('audio mixer and hybrid target HUD copy exists for every supported locale', () => {
  const keys = [
    'audioMixer', 'masterVolume', 'musicVolume', 'weaponVolume', 'effectsVolume',
    'musicOn', 'musicOff', 'flashlightOn', 'flashlightOff', 'flashlightUnsupported',
    'qrFreshTarget', 'qrRetainedLock', 'qrAutomaticTarget', 'qrNoTarget',
    'qrClearTarget', 'qrSwitchTarget', 'qrTargetHelp',
  ];
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of keys) {
      assert.ok(TRANSLATIONS[locale][key].trim(), `${locale} ${key} copy must not be empty`);
    }
  }
});