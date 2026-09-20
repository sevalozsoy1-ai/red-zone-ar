import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_AUDIO_VOLUMES,
  effectiveEffectsVolume,
  effectiveMusicVolume,
  effectiveWeaponVolume,
  normalizeAudioVolume,
  normalizeAudioVolumes,
} from '../lib/audio-settings.ts';

test('audio volume values are clamped and invalid values use safe defaults', () => {
  assert.equal(normalizeAudioVolume(-0.5), 0);
  assert.equal(normalizeAudioVolume(1.5), 1);
  assert.equal(normalizeAudioVolume(Number.NaN), 1);
  assert.equal(normalizeAudioVolume('0.4'), 1);
});

test('legacy or partial audio preferences migrate to all four normalized channels', () => {
  assert.deepEqual(normalizeAudioVolumes({ master: 0.8, music: 0.25, weapon: 2 }), {
    master: 0.8,
    music: 0.25,
    weapon: 1,
    effects: 1,
  });
  assert.deepEqual(normalizeAudioVolumes(null), DEFAULT_AUDIO_VOLUMES);
});

test('effective gains combine master and channel volumes', () => {
  const volumes = { master: 0.8, music: 0.25, weapon: 0.5, effects: 0.1 };
  assert.equal(effectiveMusicVolume(volumes), 0.2);
  assert.equal(effectiveWeaponVolume(volumes), 0.4);
  assert.ok(Math.abs(effectiveEffectsVolume(volumes) - 0.08) < Number.EPSILON);
});