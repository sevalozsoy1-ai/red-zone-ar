import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const battle = await readFile(new URL('../components/BattleScreen.tsx', import.meta.url), 'utf8');
const activeBattle = battle.split('/*\nexport default function BattleScreen')[0];
const nativeCamera = await readFile(new URL('../android/app/src/main/java/com/ephesusmedya/redzonear/BeaconCameraView.kt', import.meta.url), 'utf8');
const cameraWrapper = await readFile(new URL('../components/BeaconCamera.tsx', import.meta.url), 'utf8');

test('solo shot torch honors the player setting rather than being disabled', () => {
  assert.match(activeBattle, /flashlightEnabled=\{flashlightEnabled\}/);
  assert.doesNotMatch(activeBattle, /flashlightEnabled=\{false\}/);
});

test('the room camera only declares itself live after preview and analyzed frames', () => {
  assert.match(nativeCamera, /PreviewView\.StreamState\.STREAMING/);
  assert.match(nativeCamera, /previewStreaming && lastFrameAt >= cameraStartedAt/);
  assert.match(nativeCamera, /"error",\s*"Oda kamerası görüntü üretmiyor/);
});

test('Android simulation never registers a missing native camera or pretends to detect targets', () => {
  assert.match(cameraWrapper, /UIManager\.getViewManagerConfig\("RedZoneBeaconCamera"\)/);
  assert.match(cameraWrapper, /nativeCameraAvailable\s*\?\s*requireNativeComponent/);
  assert.match(cameraWrapper, /if \(!NativeBeaconCamera\) \{\s*return <View/);
  assert.match(cameraWrapper, /state: "unsupported",\s*message: "Bu önizleme özel oda kamerasını içermiyor/);
  assert.match(activeBattle, /status\.state !== 'requesting' && status\.state !== 'unsupported'/);
});

test('the multiplayer preview is outside transformed views and scope zoom uses native camera control', () => {
  const cameraTree = activeBattle.split('testID="battle-screen">')[1]?.split('<VisionModeOverlay')[0];
  assert.ok(cameraTree);
  assert.match(cameraTree, /^\s*\{battleSession \? <BeaconCamera/);
  assert.match(cameraTree, /zoomRatio=\{isScopeActive && isScopedWeapon \? w\.zoom : 1\}/);
  assert.match(nativeCamera, /controller\.cameraControl\?\.setZoomRatio\(requested\)/);
});

test('a torch failure cannot unbind or conceal the room camera', () => {
  const failure = nativeCamera.split('private fun failTorch()')[1]?.split('private fun isSupersededTorchRequest')[0];
  assert.ok(failure);
  assert.match(failure, /onStatus\?\.invoke\("error"/);
  assert.doesNotMatch(failure, /pauseCamera\(\)|controller\.unbind\(\)/);
});

test('each qualified beacon detection reaches the two-observation combat gate', () => {
  const qualified = nativeCamera.split('if (bestId >= 0 && best >= 0.82f')[1]?.split('} else {')[0];
  assert.ok(qualified, 'native decoder has a qualified detection branch');
  assert.match(qualified, /onBeacon\?\.invoke\(bestId, best\)/);
  assert.doesNotMatch(qualified, /if \(bestId != lastMarker\)/);
  assert.match(activeBattle, /consecutiveFrames: 2/);
  assert.match(activeBattle, /networkSocket\.sendFlashObservation\(\{[\s\S]*?shooterBeaconId: detectedMarkerId/);
});