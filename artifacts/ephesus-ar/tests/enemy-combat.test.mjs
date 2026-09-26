import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceEnemyCombat, enemyAimCenter, enemyCenter, hideEnemy, hitMedkitDrop, hitPeekingEnemy, medkitAimCenter, projectileProgress, scheduleEnemyAppearance, tankProgress, weaponDamage,
  PLAYER_HEALTH, startEnemyRound,
} from '../lib/enemy-combat.ts';
import { automaticSoundIntervalMs, heldShotIntervalMs } from '../lib/automatic-fire.ts';
import { effectiveScopeZoom } from '../lib/scope-zoom.ts';
import { WEAPONS } from '../lib/weapons.ts';

function revealNext(state, chance = 0) {
  const warned = advanceEnemyCombat(state, state.nextAppearanceAt, chance);
  assert.ok(warned.warning);
  assert.equal(warned.enemy, null);
  assert.equal(warned.warning.appearsAt, null);
  const scheduled = scheduleEnemyAppearance(warned, warned.warning.id, state.nextAppearanceAt);
  assert.equal(advanceEnemyCombat(scheduled, scheduled.warning.appearsAt - 1, chance), scheduled);
  return advanceEnemyCombat(scheduled, scheduled.warning.appearsAt, chance);
}

function revealCobra(state, dropChance = 0.29) {
  const warned = advanceEnemyCombat(state, state.nextAppearanceAt, 0.62);
  assert.equal(warned.warning.variant, 'cobra');
  const scheduled = scheduleEnemyAppearance(warned, warned.warning.id, state.nextAppearanceAt);
  return advanceEnemyCombat(scheduled, scheduled.warning.appearsAt, dropChance);
}

test('enemies peek from alternating reachable corners, fire once, and retreat', () => {
  let round = startEnemyRound(1000);
  assert.equal(round.health, PLAYER_HEALTH);
  assert.equal(round.enemy, null);
  assert.equal(advanceEnemyCombat(round, round.nextAppearanceAt - 1, 0), round);
  round = advanceEnemyCombat(round, round.nextAppearanceAt, 0);
  assert.ok(round.warning);
  assert.equal(round.enemy, null);
  const warning = round.warning;
  assert.equal(advanceEnemyCombat(round, round.nextAppearanceAt + 60_000, 0), round);
  round = scheduleEnemyAppearance(round, warning.id, round.nextAppearanceAt + 60_000);
  assert.equal(advanceEnemyCombat(round, round.warning.appearsAt - 1, 0), round);
  round = advanceEnemyCombat(round, round.warning.appearsAt, 0);
  const first = round.enemy;
  assert.ok(first);
  assert.equal(first.id, warning.id);
  assert.equal(first.variant, warning.variant);
  assert.equal(advanceEnemyCombat(round, first.appearedAt + 600, 0), round);
  round = advanceEnemyCombat(round, first.firesAt, 0);
  assert.equal(round.health, 9);
  assert.equal(round.enemy.fired, true);
  assert.equal(advanceEnemyCombat(round, first.firesAt + 20, 0), round);
  round = advanceEnemyCombat(round, first.leavesAt, 0);
  assert.equal(round.enemy, null);
  round = revealNext(round);
  assert.notEqual(round.enemy.corner, first.corner);
});

test('aimed shots count one kill while misses and hidden enemies do not', () => {
  let round = startEnemyRound(0);
  round = revealNext(round);
  const aim = enemyCenter(round.enemy.corner, 402, 874);
  assert.equal(hitPeekingEnemy(round, { x: 201, y: 437 }, 402, 874, round.enemy.appearedAt + 50), round);
  round = hitPeekingEnemy(round, aim, 402, 874, round.enemy.appearedAt + 100);
  assert.equal(round.kills, 1);
  assert.equal(round.enemy, null);
  assert.equal(round.death.variant, 'rifle');
  assert.equal(advanceEnemyCombat(round, round.death.diedAt + 999, 0).death.id, round.death.id);
  assert.equal(advanceEnemyCombat(round, round.death.diedAt + 1000, 0).death, null);
  assert.equal(hitPeekingEnemy(round, aim, 402, 874, 1700), round);
  assert.equal(hideEnemy(round, 1800).death, null);
});

test('ten enemy attacks end the round; restart restores ten health and zero kills', () => {
  let round = startEnemyRound(0);
  let now = round.nextAppearanceAt;
  for (let i = 0; i < 10; i += 1) {
    // Isolate the single-shot opponent; the encounter selector normally avoids repeats.
    round = { ...round, lastVariant: null };
    round = revealNext(round);
    now = round.enemy.firesAt;
    round = advanceEnemyCombat(round, now, 0);
    assert.equal(round.health, 9 - i);
    if (i < 9) {
      now = round.enemy.leavesAt;
      round = advanceEnemyCombat(round, now, 0);
      now = round.nextAppearanceAt;
    }
  }
  assert.equal(advanceEnemyCombat(round, now + 9000, 0), round);
  assert.deepEqual([startEnemyRound(now).health, startEnemyRound(now).kills], [10, 0]);
});

test('closely spaced peeks cannot drain several lives while the player aims', () => {
  const fresh = startEnemyRound(0);
  let round = revealNext(fresh);
  round = advanceEnemyCombat(round, round.enemy.firesAt, 0);
  const firstHitAt = round.lastDamageAt;
  assert.equal(round.health, 9);
  const second = { ...round, enemy: { ...round.enemy, id: 2, firesAt: firstHitAt + 1000, nextShotAt: firstHitAt + 1000, shotsFired: 0, fired: false } };
  const protectedShot = advanceEnemyCombat(second, firstHitAt + 1000, 0);
  assert.equal(protectedShot.health, 9);
  assert.equal(protectedShot.enemy.fired, true);
  assert.equal(protectedShot.lastDamageAt, firstHitAt);
});

test('all four hit centers stay within mobile aim limits; blasts reach nearby targets', () => {
  for (const [width, height] of [[375, 720], [402, 874]]) {
    for (const corner of ['upper-left', 'upper-right', 'lower-left', 'lower-right']) {
      const { x, y } = enemyCenter(corner, width, height);
      assert.ok(x >= 40 && x <= width - 40);
      assert.ok(y >= 160 && y <= height - 160);
      if (corner.startsWith('upper')) assert.ok(y >= 255, 'upper enemies clear the two-row HUD');
    }
  }
  const starting = startEnemyRound(0);
  const round = revealNext(starting);
  const target = enemyCenter(round.enemy.corner, 402, 874);
  const nearby = { x: target.x + 65, y: target.y };
  assert.equal(hitPeekingEnemy(round, nearby, 402, 874, 1600), round);
  assert.equal(hitPeekingEnemy(round, nearby, 402, 874, 1600, 1.7).kills, 1);
});

test('each warning selects a fixed distinct loadout and its radio cue before an enemy appears', () => {
  for (const [chance, expected] of [[0, 'rifle'], [0.21, 'scout'], [0.31, 'heavy'], [0.43, 'sniper'], [0.55, 'rocketeer'], [0.62, 'cobra'], [0.73, 'tank'], [0.86, 'sidecar'], [0.99, 'jet']]) {
    const starting = startEnemyRound(0);
    const warningState = advanceEnemyCombat(starting, starting.nextAppearanceAt, chance);
    assert.equal(warningState.warning.variant, expected);
    assert.equal(warningState.warning.radioCue, expected === 'cobra' || expected === 'jet' ? 'air' : 'urgent');
    assert.equal(warningState.warning.id, 1);
    assert.equal(warningState.warning.appearsAt, null);
    assert.equal(advanceEnemyCombat(warningState, starting.nextAppearanceAt + 100, chance), warningState);
    const scheduled = scheduleEnemyAppearance(warningState, 1, starting.nextAppearanceAt + 100);
    assert.equal(scheduleEnemyAppearance(scheduled, 1, starting.nextAppearanceAt + 200), scheduled);
    const visible = advanceEnemyCombat(scheduled, scheduled.warning.appearsAt, chance);
    assert.equal(visible.enemy.variant, expected);
    assert.equal(visible.enemy.id, 1);
    assert.equal(visible.warning, null);
    const hidden = hideEnemy(warningState, starting.nextAppearanceAt + 100);
    assert.equal(hidden.warning, null);
    assert.equal(scheduleEnemyAppearance(hidden, 1, starting.nextAppearanceAt + 200), hidden);
  }
  let round = startEnemyRound(0);
  const first = advanceEnemyCombat(round, round.nextAppearanceAt, 0);
  round = hideEnemy(first, first.nextAppearanceAt);
  const second = advanceEnemyCombat(round, round.nextAppearanceAt, 0);
  assert.notEqual(second.warning.variant, first.warning.variant);
  assert.equal(second.warning.radioCue, 'standard');
});

test('automatic gunners fire rapid bursts but exactly ten hits cost one life, even across encounters', () => {
  for (const [chance, expected] of [[0.21, 'scout'], [0.31, 'heavy']]) {
    let round = revealNext(startEnemyRound(0), chance);
    assert.equal(round.enemy.variant, expected);
    for (let hit = 1; hit <= 10; hit += 1) {
      round = advanceEnemyCombat(round, round.enemy.nextShotAt, chance);
      assert.equal(round.enemy.shotsFired, hit);
      assert.equal(round.automaticHits, hit % 10);
      assert.equal(round.automaticTotalHits, hit);
      assert.equal(round.health, hit === 10 ? 9 : 10);
      assert.equal(round.lastAttack.kind, 'shot');
    }
    const healthAfterTen = round.health;
    const unchanged = advanceEnemyCombat(round, round.enemy.nextShotAt - 1, chance);
    assert.equal(unchanged, round);
    round = advanceEnemyCombat(round, round.enemy.leavesAt, chance);
    assert.equal(round.health, healthAfterTen);
  }
  let partial = revealNext(startEnemyRound(0), 0.21);
  for (let i = 0; i < 9; i += 1) partial = advanceEnemyCombat(partial, partial.enemy.nextShotAt, 0);
  partial = hideEnemy(partial, partial.enemy.nextShotAt);
  const another = revealNext(partial, 0.21);
  const tenth = advanceEnemyCombat(another, another.enemy.nextShotAt, 0);
  assert.equal(tenth.health, 9);
  assert.equal(tenth.automaticHits, 0);
  assert.equal(tenth.automaticTotalHits, 10);
  let sustained = revealNext(startEnemyRound(0), 0.21);
  for (let i = 0; i < 12; i += 1) sustained = advanceEnemyCombat(sustained, sustained.enemy.nextShotAt, 0);
  sustained = hideEnemy(sustained, sustained.enemy.nextShotAt);
  sustained = revealNext(sustained, 0.21);
  for (let i = 0; i < 8; i += 1) sustained = advanceEnemyCombat(sustained, sustained.enemy.nextShotAt, 0);
  assert.equal(sustained.health, 8);
  assert.equal(sustained.automaticHits, 0);
  assert.equal(sustained.automaticTotalHits, 20);
});

test('rockets and Cobra projectiles fly before impact and are cancelled when combat hides', () => {
  for (const [chance, expected] of [[0.55, 'rocketeer'], [0.62, 'cobra']]) {
    let round = revealNext(startEnemyRound(0), chance);
    assert.equal(round.enemy.variant, expected);
    if (expected === 'cobra') assert.ok(round.enemy.corner.startsWith('upper'));
    round = advanceEnemyCombat(round, round.enemy.nextShotAt, 0);
    assert.equal(round.health, 10);
    assert.equal(round.lastAttack.kind, 'launch');
    assert.equal(round.projectile.variant, expected);
    assert.equal(projectileProgress(round.projectile, round.projectile.launchedAt), 0);
    assert.equal(projectileProgress(round.projectile, (round.projectile.launchedAt + round.projectile.impactsAt) / 2), 0.5);
    assert.equal(projectileProgress(round.projectile, round.projectile.impactsAt + 500), 1);
    assert.equal(advanceEnemyCombat(round, round.projectile.impactsAt - 1, 0), round);
    const impact = advanceEnemyCombat(round, round.projectile.impactsAt, 0);
    assert.equal(impact.lastAttack.kind, 'impact');
    assert.equal(impact.projectile, null);
    assert.equal(impact.health, 9);
    const cancelled = hideEnemy(round, round.projectile.launchedAt + 100);
    assert.equal(cancelled.projectile, null);
    assert.equal(cancelled.lastAttack, null);
    assert.equal(advanceEnemyCombat(cancelled, round.projectile.impactsAt, 0), cancelled);
  }
});

test('tank crosses the center and cannot be destroyed by a single handgun hit', () => {
  let round = revealNext(startEnemyRound(0), 0.73);
  assert.equal(round.enemy.variant, 'tank');
  const tank = round.enemy;
  assert.equal(tankProgress(tank, tank.appearedAt), 0);
  assert.equal(tankProgress(tank, tank.leavesAt), 1);
  const middle = tank.appearedAt + (tank.leavesAt - tank.appearedAt) / 2;
  const point = enemyAimCenter(tank, 402, 874, middle);
  assert.equal(point.x, 201);
  assert.equal(point.y, 874 * 0.49);
  assert.ok(enemyAimCenter(tank, 402, 874, tank.appearedAt).x < 0 || enemyAimCenter(tank, 402, 874, tank.appearedAt).x > 402);
  round = hitPeekingEnemy(round, point, 402, 874, middle, 1, WEAPONS[0]);
  assert.equal(round.enemy.armor, 19);
  assert.equal(round.kills, 0);
  assert.equal(round.death, null);
  assert.equal(hitPeekingEnemy(round, point, 402, 874, middle, 1, WEAPONS.find((weapon) => weapon.id === 'flashbang')), round);
  const at4 = WEAPONS.find((weapon) => weapon.id === 'at4');
  assert.equal(weaponDamage('tank', at4), 20);
  round = hitPeekingEnemy(round, point, 402, 874, middle, 1, at4);
  assert.equal(round.enemy, null);
  assert.equal(round.kills, 1);
  assert.equal(round.death.variant, 'tank');
  assert.equal(round.death.x, 201);
  assert.equal(hideEnemy(round, middle).death, null);
});

test('Cobra withstands light arms; launcher blows it up and ordinary enemies still fall in one shot', () => {
  let round = revealNext(startEnemyRound(0), 0.62);
  const point = enemyAimCenter(round.enemy, 402, 874, round.enemy.appearedAt);
  round = hitPeekingEnemy(round, point, 402, 874, round.enemy.appearedAt + 50, 1, WEAPONS[0]);
  assert.equal(round.enemy.armor, 11);
  assert.equal(round.kills, 0);
  const rpg = WEAPONS.find((weapon) => weapon.id === 'rpg-7');
  round = hitPeekingEnemy(round, point, 402, 874, round.enemy.appearedAt + 100, 1.7, rpg);
  assert.equal(round.enemy, null);
  assert.equal(round.death.variant, 'cobra');
  assert.equal(round.kills, 1);
  const infantry = revealNext(startEnemyRound(0), 0);
  assert.equal(hitPeekingEnemy(infantry, enemyAimCenter(infantry.enemy, 402, 874, infantry.enemy.appearedAt), 402, 874, infantry.enemy.appearedAt, 1, WEAPONS[0]).kills, 1);
});

test('Cobra has a deterministic low-health medkit chance and the drop falls to a reachable target', () => {
  const hurt = { ...startEnemyRound(0), health: 8 };
  const dropped = revealCobra(hurt, 0.29);
  assert.ok(dropped.medkit);
  assert.equal(dropped.medkit.id, dropped.enemy.id);
  assert.equal(dropped.medkit.droppedAt, dropped.enemy.appearedAt);
  assert.equal(dropped.medkit.expiresAt, dropped.medkit.droppedAt + 3200);
  const start = medkitAimCenter(dropped.medkit, 402, 874, dropped.medkit.droppedAt);
  const landed = medkitAimCenter(dropped.medkit, 402, 874, dropped.medkit.droppedAt + 900);
  assert.ok(start.x >= 40 && start.x <= 362);
  assert.ok(start.y >= 192 && start.y <= 682);
  assert.ok(landed.y > start.y);
  assert.ok(landed.y >= 192 && landed.y <= 682);
  assert.notEqual(landed.y, enemyAimCenter(dropped.enemy, 402, 874, dropped.enemy.appearedAt).y);

  assert.equal(revealCobra(hurt, 0.3).medkit, null);
  assert.equal(revealCobra(startEnemyRound(0), 0.1).medkit, null);
});

test('medkit hit restores exactly one health, caps at ten, and cannot reward twice', () => {
  const round = revealCobra({ ...startEnemyRound(0), health: 7 });
  const medkit = round.medkit;
  const center = medkitAimCenter(medkit, 402, 874, medkit.droppedAt + 450);
  const healed = hitMedkitDrop(round, center, 402, 874, medkit.droppedAt + 450);
  assert.equal(healed.health, 8);
  assert.equal(healed.medkit, null);
  assert.equal(hitMedkitDrop(healed, center, 402, 874, medkit.droppedAt + 460), healed);

  const atCap = hitMedkitDrop({ ...round, health: 10 }, center, 402, 874, medkit.droppedAt + 450);
  assert.equal(atCap.health, 10);
  assert.equal(atCap.medkit, null);
  assert.equal(hitMedkitDrop(atCap, center, 402, 874, medkit.droppedAt + 460), atCap);
});

test('medkit misses and expiration give no health while Cobra combat continues normally', () => {
  let round = revealCobra({ ...startEnemyRound(0), health: 6 });
  const medkit = round.medkit;
  assert.equal(hitMedkitDrop(round, { x: 201, y: 437 }, 402, 874, medkit.droppedAt + 100), round);
  assert.equal(round.health, 6);
  const expired = advanceEnemyCombat(round, medkit.expiresAt, 0);
  assert.equal(expired.medkit, null);
  assert.equal(hitMedkitDrop(expired, medkitAimCenter(medkit, 402, 874, medkit.expiresAt), 402, 874, medkit.expiresAt), expired);
  assert.equal(expired.health, 6);
  assert.equal(expired.enemy.variant, 'cobra');

  const shooting = advanceEnemyCombat(round, round.enemy.nextShotAt, 0);
  assert.equal(shooting.lastAttack.kind, 'launch');
  assert.equal(shooting.projectile.variant, 'cobra');
});

test('fighter jet flies across the upper screen and needs anti-vehicle fire to fall quickly', () => {
  let round = revealNext(startEnemyRound(0), 0.99);
  assert.equal(round.enemy.variant, 'jet');
  assert.ok(round.enemy.corner.startsWith('upper'));
  const middle = (round.enemy.appearedAt + round.enemy.leavesAt) / 2;
  const aim = enemyAimCenter(round.enemy, 402, 874, middle);
  assert.equal(aim.x, 201);
  assert.equal(aim.y, 874 * 0.31);
  round = hitPeekingEnemy(round, aim, 402, 874, middle, 1, WEAPONS[0]);
  assert.equal(round.enemy.armor, 9);
  assert.equal(round.kills, 0);
  round = hitPeekingEnemy(round, aim, 402, 874, middle, 1.7, WEAPONS.find((weapon) => weapon.id === 'bazooka'));
  assert.equal(round.enemy, null);
  assert.equal(round.death.variant, 'jet');
  assert.equal(round.kills, 1);
});

test('tank and Cobra retain armor across later passes, but destroyed vehicles respawn fully armored', () => {
  for (const [chance, variant] of [[0.73, 'tank'], [0.62, 'cobra']]) {
    let round = revealNext(startEnemyRound(0), chance);
    const first = round.enemy;
    const middle = (first.appearedAt + first.leavesAt) / 2;
    round = hitPeekingEnemy(round, enemyAimCenter(first, 402, 874, middle), 402, 874, middle, 1, WEAPONS[0]);
    const remaining = first.maxArmor - 1;
    assert.equal(round.vehicleArmor[variant], remaining);
    round = advanceEnemyCombat(round, first.leavesAt, 0);
    // The selector normally places another variety between two appearances of the same vehicle.
    round = revealNext({ ...round, lastVariant: null }, chance);
    assert.equal(round.enemy.variant, variant);
    assert.equal(round.enemy.armor, remaining);
    const next = round.enemy;
    const at = (next.appearedAt + next.leavesAt) / 2;
    round = hitPeekingEnemy(round, enemyAimCenter(next, 402, 874, at), 402, 874, at, 1.7, WEAPONS.find((weapon) => weapon.id === 'at4'));
    assert.equal(round.vehicleArmor[variant], undefined);
    assert.equal(round.death.variant, variant);
    round = revealNext({ ...round, lastVariant: null }, chance);
    assert.equal(round.enemy.armor, round.enemy.maxArmor);
  }
});

test('sidecar motorcycle is a crossing armored enemy with its own destruction', () => {
  let round = revealNext(startEnemyRound(0), 0.86);
  assert.equal(round.enemy.variant, 'sidecar');
  const at = (round.enemy.appearedAt + round.enemy.leavesAt) / 2;
  const aim = enemyAimCenter(round.enemy, 402, 874, at);
  assert.equal(aim.x, 201);
  assert.equal(aim.y, 874 * 0.58);
  round = hitPeekingEnemy(round, aim, 402, 874, at, 1, WEAPONS[0]);
  assert.equal(round.enemy.armor, 7);
  round = hitPeekingEnemy(round, aim, 402, 874, at, 1.7, WEAPONS.find((weapon) => weapon.id === 'rpg-7'));
  assert.equal(round.enemy, null);
  assert.equal(round.death.variant, 'sidecar');
  assert.equal(round.kills, 1);
});

test('automatic fire and sound are continuous at every catalog cadence; scope label equals actual zoom', () => {
  for (const weapon of WEAPONS) {
    if (weapon.automatic) {
      assert.ok(heldShotIntervalMs(weapon) <= weapon.interval + 5);
      assert.ok(automaticSoundIntervalMs(weapon) <= Math.max(75, weapon.interval));
      if (weapon.interval < 170) assert.ok(automaticSoundIntervalMs(weapon) < 170, weapon.id);
    } else {
      assert.equal(automaticSoundIntervalMs(weapon), 0);
    }
    assert.ok(effectiveScopeZoom(weapon.zoom) >= weapon.zoom);
  }
  assert.equal(heldShotIntervalMs({ interval: 50 }), 55);
  assert.equal(automaticSoundIntervalMs({ interval: 50, automatic: true }), 75);
  assert.equal(effectiveScopeZoom(1.25), 2.15);
  assert.equal(effectiveScopeZoom(4), 4);
});