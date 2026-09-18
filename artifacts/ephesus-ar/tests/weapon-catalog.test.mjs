import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPONS,
  WEAPON_CATEGORIES,
  getWeapon,
  getWeaponAction,
  getWeaponAmmoLabel,
  getWeaponFireLabel,
  getWeaponReloadLabel,
  getWeaponSupplyCopy,
  migrateWeaponId,
  isWeaponId,
} from '../lib/weapons.ts';
import { FIRE_EFFECT_RANGES, fireAnimOutwardRange } from '../lib/fire-effects.ts';

test('every catalog model is unique and resolves to playable visual/audio classes', () => {
  assert.equal(WEAPONS.length, 35);
  assert.equal(new Set(WEAPONS.map(w => w.id)).size, WEAPONS.length);
  assert.equal(WEAPON_CATEGORIES.length, 10);
  for (const w of WEAPONS) {
    assert.equal(getWeapon(w.id), w);
    assert.ok(isWeaponId(w.id));
    assert.ok(['pistol', 'rifle', 'shotgun', 'sniper', 'machinegun', 'minigun', 'grenade', 'launcher', 'energy', 'slingshot', 'melee'].includes(w.archetype));
    assert.ok(['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'machinegun', 'launcher', 'energy', 'slingshot', 'melee'].includes(w.audioArchetype));
    assert.ok(Number.isInteger(w.capacity) && w.capacity > 0);
    assert.ok(w.interval > 0 && w.recoil > 0 && w.zoom >= 1);
  }
  assert.deepEqual(
    ['bazooka', 'rpg-7', 'at4'].map((id) => getWeaponAction(getWeapon(id))),
    ['launch', 'launch', 'launch'],
  );
  assert.equal(getWeaponAction(getWeapon('laser-rifle')), 'energy');
  assert.equal(getWeaponAction(getWeapon('electric-arc')), 'energy');
  assert.equal(getWeaponAction(getWeapon('slingshot')), 'slingshot');
  assert.equal(getWeaponAction(getWeapon('knife')), 'melee');
});

test('special equipment uses non-firearm controls and ammo labels', () => {
  assert.equal(getWeaponAmmoLabel(getWeapon('bazooka')), 'ROKET');
  assert.equal(getWeaponFireLabel(getWeapon('bazooka')), 'ROKET AT');
  assert.equal(getWeaponReloadLabel(getWeapon('bazooka')), 'Yeni roket yükle');
  assert.equal(getWeaponAmmoLabel(getWeapon('slingshot')), 'ÇELİK BİLYE');
  assert.equal(getWeaponFireLabel(getWeapon('slingshot')), 'BİLYE AT');
  assert.equal(getWeaponAmmoLabel(getWeapon('knife')), 'VURUŞ');
  assert.equal(getWeaponFireLabel(getWeapon('knife')), 'BIÇAK');
  assert.equal(getWeaponReloadLabel(getWeapon('knife')), 'Bıçağı hazırla');
  assert.notEqual(getWeaponAmmoLabel(getWeapon('knife')), 'MERMİ');
});

test('supply copy follows each special weapon resource', () => {
  assert.match(getWeaponSupplyCopy(getWeapon('rpg-7')).rewardLabel, /ROKET/);
  assert.match(getWeaponSupplyCopy(getWeapon('laser-rifle')).rewardLabel, /ENERJİ/);
  assert.match(getWeaponSupplyCopy(getWeapon('slingshot')).rewardLabel, /BİLYE/);
  assert.match(getWeaponSupplyCopy(getWeapon('knife')).rewardLabel, /BIÇAĞI/);
  assert.notEqual(getWeaponSupplyCopy(getWeapon('knife')).rewardLabel, 'ŞARJÖRÜ DOLDUR');
});

test('fire effects travel outward while fireAnim decays from one to zero', () => {
  assert.deepEqual(fireAnimOutwardRange(8, -230), [-230, 8]);
  assert.deepEqual(FIRE_EFFECT_RANGES.slingshotBallY, [-230, 8]);
  assert.deepEqual(FIRE_EFFECT_RANGES.energyBeamY, [-110, 14]);
  assert.deepEqual(FIRE_EFFECT_RANGES.energyRingScale, [2.1, 0.4]);
});

test('old selections migrate without invalidating newer saved models', () => {
  for (const id of ['pistol', 'rifle', 'sniper']) assert.ok(isWeaponId(migrateWeaponId(id)));
  for (const w of WEAPONS) assert.equal(migrateWeaponId(w.id), w.id);
  for (const id of ['prism-laser', 'arc-caster', 'steel-sling', 'field-knife']) assert.ok(isWeaponId(migrateWeaponId(id)));
  assert.equal(migrateWeaponId('unknown-model'), null);
  assert.equal(migrateWeaponId(null), null);
});