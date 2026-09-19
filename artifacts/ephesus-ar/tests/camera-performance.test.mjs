import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CAMERA_PERFORMANCE_CONFIG,
  chooseAnalysisPictureSize,
  nextCameraCaptureDelayMs,
  nextFasterCameraProfile,
  nextSlowerCameraProfile,
  selectCameraPerformanceProfile,
} from '../lib/camera-performance.ts';

test('selects a conservative automatic profile from device year class', () => {
  assert.equal(selectCameraPerformanceProfile(2018), 'compatibility');
  assert.equal(selectCameraPerformanceProfile(2021), 'balanced');
  assert.equal(selectCameraPerformanceProfile(2024), 'quality');
  assert.equal(selectCameraPerformanceProfile(undefined), 'balanced');
});

test('compatibility mode reduces camera analysis load', () => {
  assert.ok(CAMERA_PERFORMANCE_CONFIG.compatibility.frameWidth < CAMERA_PERFORMANCE_CONFIG.quality.frameWidth);
  assert.ok(CAMERA_PERFORMANCE_CONFIG.compatibility.intervalMs > CAMERA_PERFORMANCE_CONFIG.quality.intervalMs);
  assert.ok(CAMERA_PERFORMANCE_CONFIG.compatibility.maxCaptureArea < CAMERA_PERFORMANCE_CONFIG.quality.maxCaptureArea);
  assert.ok(CAMERA_PERFORMANCE_CONFIG.compatibility.frameWidth >= 144);
  assert.ok(CAMERA_PERFORMANCE_CONFIG.compatibility.photoQuality >= 0.55);
  assert.ok(CAMERA_PERFORMANCE_CONFIG.compatibility.minCaptureArea >= 1280 * 720);
});

test('runtime adaptation respects the device profile ceiling', () => {
  assert.equal(nextSlowerCameraProfile('quality'), 'balanced');
  assert.equal(nextSlowerCameraProfile('balanced'), 'compatibility');
  assert.equal(nextSlowerCameraProfile('compatibility'), 'compatibility');
  assert.equal(nextFasterCameraProfile('compatibility', 'balanced'), 'balanced');
  assert.equal(nextFasterCameraProfile('balanced', 'balanced'), 'balanced');
});

test('capture scheduling never overlaps and preserves the requested cadence', () => {
  assert.equal(nextCameraCaptureDelayMs('quality', 100), 350);
  assert.equal(nextCameraCaptureDelayMs('quality', 450), 16);
  assert.equal(nextCameraCaptureDelayMs('balanced', -10), 700);
  assert.equal(nextCameraCaptureDelayMs('balanced', Number.NaN), 700);
});

test('analysis size prefers a stable 1080p-class 16:9 mode', () => {
  const sizes = ['640x480', '1280x720', '1920x1080', '4000x3000'];
  const viewport = { width: 400, height: 800 };
  assert.equal(
    chooseAnalysisPictureSize(sizes, viewport),
    '1920x1080',
  );
  assert.equal(
    chooseAnalysisPictureSize(['640x480', '1280x960', '1920x1440'], { width: 400, height: 800 }),
    '1280x960',
  );
  assert.equal(chooseAnalysisPictureSize(['640x480'], viewport), undefined);
});

test('analysis size remains stable while cadence profile adapts', () => {
  const sizes = ['1280x720', '1920x1080', '4000x3000'];
  const viewport = { width: 400, height: 800 };
  const selected = chooseAnalysisPictureSize(sizes, viewport);
  assert.equal(selected, '1920x1080');
  for (const profile of ['compatibility', 'balanced', 'quality']) {
    assert.equal(chooseAnalysisPictureSize(sizes, viewport), selected, profile);
  }
});