import type { Weapon } from './weapons';

// Leave a small margin for timers that wake a millisecond early; otherwise
// the combat interval guard can reject a shot and leave a two-beat gap.
export function heldShotIntervalMs(weapon: Pick<Weapon, 'interval'>): number {
  return Math.max(50, weapon.interval + 5);
}

// Fast weapons should make a continuous burst, without layering dozens of
// long samples on top of one another and clipping the device speaker.
export function automaticSoundIntervalMs(weapon: Pick<Weapon, 'interval' | 'automatic'>): number {
  return weapon.automatic ? Math.max(75, weapon.interval) : 0;
}