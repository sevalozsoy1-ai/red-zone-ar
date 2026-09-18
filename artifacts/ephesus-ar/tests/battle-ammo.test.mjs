import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMatchMagazineInventory,
  equipMagazine,
  refillMagazines,
  reloadMagazine,
  setMagazineAmmo,
} from '../lib/battle-ammo.ts';

test('match magazine budget is loaded plus two reserves and unseen weapons consume reserves', () => {
  let inventory = createMatchMagazineInventory('pistol', 12);
  assert.deepEqual(inventory.weapons.pistol, { capacity: 12, ammo: 12 });
  assert.equal(inventory.reserveMagazines, 2);

  let equipped = equipMagazine(inventory, 'smg', 30);
  inventory = equipped.inventory;
  assert.equal(equipped.ammo, 30);
  assert.equal(equipped.consumedReserve, true);
  assert.equal(inventory.reserveMagazines, 1);

  equipped = equipMagazine(inventory, 'rifle', 30);
  inventory = equipped.inventory;
  assert.equal(equipped.ammo, 30);
  assert.equal(inventory.reserveMagazines, 0);

  equipped = equipMagazine(inventory, 'launcher', 1);
  assert.equal(equipped.ammo, 0);
  assert.equal(equipped.consumedReserve, false);
});

test('empty refill fills current and leaves two reserves; partial refill preserves current and adds three', () => {
  let inventory = createMatchMagazineInventory('pistol', 12);
  let refilled = refillMagazines(inventory, 'pistol', 12);
  assert.equal(refilled.filledExisting, false);
  assert.equal(refilled.ammo, 12);
  assert.equal(refilled.inventory.reserveMagazines, 5);

  inventory = setMagazineAmmo(inventory, 'pistol', 12, 0);
  refilled = refillMagazines(inventory, 'pistol', 12);
  inventory = refilled.inventory;
  assert.equal(refilled.filledExisting, true);
  assert.equal(refilled.ammo, 12);
  assert.equal(inventory.reserveMagazines, 4);

  inventory = setMagazineAmmo(inventory, 'pistol', 12, 4);
  refilled = refillMagazines(inventory, 'pistol', 12);
  assert.equal(refilled.filledExisting, false);
  assert.equal(refilled.ammo, 4);
  assert.equal(refilled.inventory.reserveMagazines, 7);
});

test('reload consumes one shared reserve and never reloads a full magazine', () => {
  let inventory = createMatchMagazineInventory('pistol', 12);
  inventory = setMagazineAmmo(inventory, 'pistol', 12, 5);
  let reloaded = reloadMagazine(inventory, 'pistol', 12);
  assert.equal(reloaded.ammo, 12);
  assert.equal(reloaded.consumedReserve, true);
  assert.equal(reloaded.inventory.reserveMagazines, 1);

  reloaded = reloadMagazine(reloaded.inventory, 'pistol', 12);
  assert.equal(reloaded.consumedReserve, false);
  assert.equal(reloaded.inventory.reserveMagazines, 1);
});