import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { applyBattleWeaponSelection } from '../lib/battle-weapon-selection.ts';

test('an unlocked weapon selection closes the picker and saves the new weapon', () => {
  const events = [];
  let pickerVisible = true;
  let selectedWeapon = 'pistol';

  const changed = applyBattleWeaponSelection({
    currentWeapon: selectedWeapon,
    nextWeapon: 'ak47',
    closePicker: () => {
      pickerVisible = false;
      events.push('close');
    },
    stopActions: () => events.push('stop'),
    saveCurrentAmmo: () => events.push('save-ammo'),
    selectWeapon: (id) => {
      selectedWeapon = id;
      events.push(`select:${id}`);
    },
  });

  assert.equal(changed, true);
  assert.equal(pickerVisible, false);
  assert.equal(selectedWeapon, 'ak47');
  assert.deepEqual(events, ['close', 'stop', 'save-ammo', 'select:ak47']);
});

test('tapping the equipped weapon still closes the picker without resetting combat state', () => {
  const events = [];

  const changed = applyBattleWeaponSelection({
    currentWeapon: 'pistol',
    nextWeapon: 'pistol',
    closePicker: () => events.push('close'),
    stopActions: () => events.push('stop'),
    saveCurrentAmmo: () => events.push('save-ammo'),
    selectWeapon: (id) => events.push(`select:${id}`),
  });

  assert.equal(changed, false);
  assert.deepEqual(events, ['close']);
});

test('catalog weapon presses cannot reintroduce touch-time native preloading', async () => {
  const [catalogSource, battleSource] = await Promise.all([
    readFile(new URL('../components/WeaponCatalogList.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/BattleScreen.tsx', import.meta.url), 'utf8'),
  ]);

  const activeBattleSource = battleSource.split('/*\nexport default function BattleScreen')[0];

  assert.match(catalogSource, /onPress=\{\(\) => chooseWeapon\(item\)\}/);
  assert.doesNotMatch(catalogSource, /\bonPressIn\s*=/);
  assert.doesNotMatch(catalogSource, /\bonPrepare\b/);
  assert.doesNotMatch(catalogSource, /\b(?:Asset|Image)\.prefetch\b|\bdownloadAsync\b|\bprepareWeapon\b/);

  assert.match(
    activeBattleSource,
    /<WeaponCatalogList compact selectedWeapon=\{selectedWeapon\} onSelect=\{handleWeaponSelect\} \/>/,
  );
  assert.doesNotMatch(activeBattleSource, /\bonPrepare\s*=/);
  assert.doesNotMatch(activeBattleSource, /\bprepareWeaponSelection\b|\bAsset\.fromModule\b|\bdownloadAsync\b/);
});
