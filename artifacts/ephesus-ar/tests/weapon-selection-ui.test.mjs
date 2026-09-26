import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('battle picker gives the catalog a bounded Android modal viewport', async () => {
  const battle = await source('components/BattleScreen.tsx');
  const catalog = await source('components/WeaponCatalogList.tsx');

  assert.match(battle, /picker:\s*\{\s*height:\s*'82%'\s*,\s*maxHeight:\s*'82%'/);
  assert.match(catalog, /catalogList:\s*\{\s*flex:\s*1\s*,\s*minHeight:\s*0\s*\}/);
  assert.match(catalog, /<SectionList\s+style=\{s\.catalogList\}/);
});

test('the saved weapon is visibly selected and selection is announced', async () => {
  const catalog = await source('components/WeaponCatalogList.tsx');
  const selection = await source('components/WeaponSelectionScreen.tsx');

  assert.match(catalog, /accessibilityRole="radio"/);
  assert.match(catalog, /accessibilityState=\{\{ checked: selected, disabled: !unlocked \}\}/);
  assert.match(catalog, /selected && s\.selectedCard/);
  assert.match(catalog, /name="check-circle"/);
  assert.match(catalog, /AccessibilityInfo\.announceForAccessibility\(feedback\)/);
  assert.match(catalog, /selectionFeedback/);
  assert.match(selection, /selected-weapon-summary/);
  assert.match(selection, /setSelectedWeapon/);
});

test('locked weapons still use the existing credit and unlock gate', async () => {
  const catalog = await source('components/WeaponCatalogList.tsx');

  assert.match(catalog, /unlockWeaponWithCredits\(weapon\.id\)/);
  assert.match(catalog, /<EconomyGate/);
  assert.match(catalog, /onComplete=\{\(\) => \{/);
});