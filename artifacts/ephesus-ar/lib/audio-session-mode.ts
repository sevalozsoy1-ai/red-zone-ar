/**
 * On Android, mixing skips AudioManager focus requests, so a later interruption
 * can leave effects playing into a lost/ducked session. Game audio claims
 * transient focus there; other platforms keep the existing mix behavior.
 */
export function audioInterruptionModeForPlatform(
  platform: string,
): 'doNotMix' | 'mixWithOthers' {
  return platform === 'android' ? 'doNotMix' : 'mixWithOthers';
}