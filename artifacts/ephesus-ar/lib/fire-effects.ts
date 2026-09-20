export const fireAnimOutwardRange = (start: number, end: number): [number, number] => [end, start];

/**
 * BattleScreen starts a shot at fireAnim=1 and eases it back to 0.
 * These ranges keep each effect moving from its muzzle/source toward its
 * destination instead of replaying the trajectory in reverse.
 */
export const FIRE_EFFECT_RANGES = {
  energyRingScale: fireAnimOutwardRange(0.4, 2.1),
  energyBeamY: fireAnimOutwardRange(14, -110),
  arcBoltScale: fireAnimOutwardRange(0.4, 1),
  slingshotBallY: fireAnimOutwardRange(8, -230),
  slingshotStreakScaleY: fireAnimOutwardRange(0.2, 1),
  launchSmokeY: fireAnimOutwardRange(12, -44),
};