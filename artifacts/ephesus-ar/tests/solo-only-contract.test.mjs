import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = async (path) => readFile(new URL(path, root), 'utf8');
const isPresent = async (path) => stat(new URL(path, root)).then(() => true, () => false);

test('home launches only the local camera game', async () => {
  const home = await source('app/index.tsx');
  const screen = await source('components/BattleScreen.tsx');
  assert.match(home, /<BattleScreen onExit=/);
  assert.doesNotMatch(home, /BattleLobbyScreen|battleSession|createRoom|joinRoom/);
  assert.match(screen, /<LiveBattleCamera/);
  assert.doesNotMatch(screen, /BeaconCamera|battleSession|useBattleSocket|useGetBattleState/);
  assert.equal(await isPresent('components/BattleLobbyScreen.tsx'), false);
});

test('Android app does not register the removed camera view', async () => {
  const nativeApp = await source('android/app/src/main/java/com/ephesusmedya/redzonear/MainApplication.kt');
  assert.doesNotMatch(nativeApp, /BeaconCameraPackage/);
  assert.equal(await isPresent('android/app/src/main/java/com/ephesusmedya/redzonear/BeaconCameraView.kt'), false);
});

test('free play exposes separate front, rear and flash controls', async () => {
  const screen = await source('components/BattleScreen.tsx');
  const camera = await source('components/LiveBattleCamera.tsx');
  assert.match(screen, /testID=\{`camera-\$\{side\}-button`\}/);
  assert.match(screen, /testID="camera-flash-button"/);
  assert.match(screen, /facing=\{facing\}/);
  assert.match(screen, /torchOn=\{torchOn\}/);
  assert.match(screen, /setTorchOn\(false\)/);
  assert.match(camera, /enableTorch=\{facing === "back" && appActive && \(torchOn \|\| torchEnabled\)\}/);
});