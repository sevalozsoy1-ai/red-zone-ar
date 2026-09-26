import test from 'node:test';
import assert from 'node:assert/strict';
import { addImpact, updateImpacts, BURN_DURATION_MS, MAX_IMPACTS } from '../lib/impact-tracker.ts';
import { impactForWeapon, projectileFlightMs } from '../lib/weapon-impact.ts';
import { WEAPONS } from '../lib/weapons.ts';

function sceneValue(x, y) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return 35 + Math.floor((value - Math.floor(value)) * 155);
}

function frameAt(x, y, sceneOffsetX = 0, sceneOffsetY = 0) {
  const width = 160;
  const height = 160;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const sceneX = px + sceneOffsetX;
      const sceneY = py + sceneOffsetY;
      const hasSceneTexture = x !== null;
      const value = hasSceneTexture ? sceneValue(sceneX, sceneY) : 30;
      const index = (py * width + px) * 4;
      data[index] = value; data[index + 1] = value; data[index + 2] = value; data[index + 3] = 255;
    }
  }
  if (x !== null && y !== null) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const value = 40 + ((dx * 29 + dy * 43 + 2000) % 185);
        const index = ((y + dy) * width + x + dx) * 4;
        data[index] = value; data[index + 1] = value; data[index + 2] = value;
      }
    }
  }
  return { width, height, data };
}

function texturedScene(movingTargetX = null, sceneOffsetX = 0, sceneOffsetY = 0) {
  const width = 160;
  const height = 160;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // Stable, spatially distinctive detail in the stationary background.
      const value = sceneValue(x + sceneOffsetX, y + sceneOffsetY);
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  if (movingTargetX !== null) {
    for (let y = 65; y <= 95; y += 1) {
      for (let x = movingTargetX - 15; x <= movingTargetX + 15; x += 1) {
        const offset = (y * width + x) * 4;
        const value = 100 + (sceneValue(x - movingTargetX, y - 80) % 156);
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
      }
    }
  }
  return { width, height, data };
}

function isolatedTexture(x, y) {
  const width = 160;
  const height = 160;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    data[offset] = 30;
    data[offset + 1] = 30;
    data[offset + 2] = 30;
    data[offset + 3] = 255;
  }
  for (let dy = -6; dy <= 6; dy += 1) {
    for (let dx = -6; dx <= 6; dx += 1) {
      const value = sceneValue(dx, dy);
      const offset = ((y + dy) * width + x + dx) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
    }
  }
  return { width, height, data };
}

test('a textured hit follows the moving camera-image region', () => {
  const initial = addImpact([], frameAt(80, 80), { x: 0.5, y: 0.5 }, 'burn', 1, 1000);
  assert.ok(initial[0].patch);
  const moved = updateImpacts(initial, frameAt(86, 82, -6, -2), 1200);
  assert.equal(moved[0].visible, true);
  assert.ok(Math.abs(moved[0].x - 86 / 160) < 0.015);
  assert.ok(Math.abs(moved[0].y - 82 / 160) < 0.015);
});

test('an occluded hit hides then reappears after two matches on return', () => {
  const initial = addImpact([], frameAt(80, 80), { x: 0.5, y: 0.5 }, 'burn', 1, 1000);
  const missing = updateImpacts(initial, frameAt(null, null, 500, 700), 1800);
  assert.equal(missing[0].visible, false);
  const first = updateImpacts(missing, frameAt(32, 44, 48, 36), 2600);
  assert.equal(first[0].visible, false);
  const restored = updateImpacts(first, frameAt(32, 44, 48, 36), 2800);
  assert.equal(restored[0].visible, true);
  assert.ok(Math.abs(restored[0].x - 32 / 160) < 0.015);
});

test('a return pan re-acquires a textured fixed target at its new camera coordinate', () => {
  const firstView = addImpact([], frameAt(82, 78), { x: 82 / 160, y: 78 / 160 }, 'burn', 1, 1000);
  assert.ok(firstView[0].patch);
  const turnedAway = updateImpacts(firstView, frameAt(null, null, 500, 700), 1800);
  assert.equal(turnedAway[0].visible, false);
  const returnedFirstFrame = updateImpacts(turnedAway, frameAt(32, 52, 50, 26), 2600);
  assert.equal(returnedFirstFrame[0].visible, false);
  const returnedSecondFrame = updateImpacts(returnedFirstFrame, frameAt(32, 52, 50, 26), 3100);
  assert.equal(returnedSecondFrame[0].visible, true);
  assert.ok(Math.abs(returnedSecondFrame[0].x - 32 / 160) < 0.015);
  assert.equal(returnedSecondFrame[0].expiresAt, 1000 + BURN_DURATION_MS);
});

test('same physical fire coalesces after a large camera pan using scene anchors', () => {
  const firstScene = texturedScene();
  const initial = addImpact([], firstScene, { x: 82 / 160, y: 78 / 160 }, 'firestorm', 1, 1000);
  const away = updateImpacts(initial, frameAt(null, null), 1800);
  const returnedFirst = updateImpacts(away, texturedScene(null, 50, 26), 2600);
  const returned = updateImpacts(returnedFirst, texturedScene(null, 50, 26), 2800);
  assert.equal(returned[0].visible, true);
  assert.ok(Math.hypot(returned[0].x - initial[0].x, returned[0].y - initial[0].y) > 0.05);
  const repeatedShot = addImpact(
    returned,
    texturedScene(null, 50, 26),
    { x: 32 / 160, y: 52 / 160 },
    'firestorm',
    2,
    3000,
  );
  assert.equal(repeatedShot.length, 1);
  assert.equal(repeatedShot[0].id, 1);
  assert.equal(repeatedShot[0].expiresAt, 3000 + BURN_DURATION_MS);
});

test('a large textured moving target is hidden when the background stays still', () => {
  const initial = addImpact([], texturedScene(80), { x: 0.5, y: 0.5 }, 'burn', 1, 1000);
  assert.ok(initial[0].patch);
  const afterTargetMoves = updateImpacts(initial, texturedScene(102), 1450);
  assert.equal(afterTargetMoves[0].visible, false, 'a moving object must not pull the burn');
});

test('rapid fire coalesces at one fixed anchor and keeps burning through pan-away and return', () => {
  const scene = texturedScene();
  let impacts = [];
  for (let shot = 0; shot < 12; shot += 1) {
    impacts = addImpact(impacts, scene, { x: 0.5, y: 0.5 }, 'firestorm', shot + 1, 1000 + shot * 100);
  }
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].id, 1);
  assert.equal(impacts[0].expiresAt, 2100 + BURN_DURATION_MS);

  const away = updateImpacts(impacts, frameAt(null, null), 5000);
  assert.equal(away[0].visible, false);
  const firstReturn = updateImpacts(away, scene, 6000);
  assert.equal(firstReturn[0].visible, false);
  const returned = updateImpacts(firstReturn, scene, 6200);
  assert.equal(returned[0].visible, true);
  assert.ok(Math.abs(returned[0].x - 0.5) < 0.015);
  assert.equal(updateImpacts(returned, scene, returned[0].expiresAt - 1).length, 1);
  assert.equal(updateImpacts(returned, scene, returned[0].expiresAt).length, 0);
});

test('four spatially distinct fire anchors remain independently tracked', () => {
  const scene = texturedScene();
  let impacts = [];
  for (let shot = 0; shot < 4; shot += 1) {
    impacts = addImpact(impacts, scene, { x: 0.25 + shot * 0.16, y: 0.5 }, 'firestorm', shot + 1, 1000 + shot);
  }
  assert.equal(impacts.length, MAX_IMPACTS);
  assert.equal(new Set(impacts.map((impact) => impact.id)).size, MAX_IMPACTS);
});

test('featureless targets expire rather than pretending to have a lasting world anchor', () => {
  const untracked = addImpact([], frameAt(null, null), { x: 0.5, y: 0.5 }, 'burn', 1, 1000);
  assert.equal(untracked[0].patch, null);
  assert.equal(updateImpacts(untracked, frameAt(null, null), 2300).length, 0);
  const isolated = addImpact([], isolatedTexture(80, 80), { x: 0.5, y: 0.5 }, 'burn', 9, 1000);
  assert.equal(isolated[0].patch, null);
  assert.equal(isolated[0].expiresAt, 2200);
  const tracked = addImpact([], frameAt(80, 80), { x: 0.5, y: 0.5 }, 'burn', 2, 1000);
  assert.equal(tracked[0].expiresAt, 1000 + BURN_DURATION_MS);
  let impacts = tracked;
  for (let id = 3; id < 10; id++) impacts = addImpact(impacts, frameAt(80, 80), { x: 0.5, y: 0.5 }, 'blast', id, 1000);
  assert.equal(impacts.length, MAX_IMPACTS);
});

test('every catalog weapon has a deliberately chosen hit and only projectiles wait for arrival', () => {
  for (const weapon of WEAPONS) {
    assert.ok(impactForWeapon(weapon), `no impact for ${weapon.id}`);
    assert.equal(projectileFlightMs(weapon) > 0, weapon.archetype === 'grenade' || weapon.archetype === 'launcher');
  }
  const effect = (id) => impactForWeapon(WEAPONS.find((weapon) => weapon.id === id));
  assert.equal(effect('frag-grenade'), 'frag');
  assert.equal(effect('flashbang'), 'flash');
  assert.equal(effect('smoke-grenade'), 'smoke');
  assert.equal(effect('bazooka'), 'rocket');
  assert.equal(effect('rpg-7'), 'rocket');
  assert.equal(effect('at4'), 'rocket');
  assert.notEqual(effect('glock-17'), effect('remington-870'));
  assert.notEqual(effect('remington-870'), effect('laser-rifle'));
});