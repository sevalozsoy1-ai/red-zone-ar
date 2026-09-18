/**
 * Startup preference loading must not depend on the persisted onboarding
 * value. A returning user can already be onboarded while device preferences
 * still need their one-time async read to complete.
 */
export function shouldApplyDevicePreferences(
  ready: boolean,
  applied: boolean,
  externalCamera: boolean,
): boolean {
  return ready && !applied && !externalCamera;
}

export function canLeaveBoot(
  ready: boolean,
  applied: boolean,
  externalCamera: boolean,
): boolean {
  return ready && (applied || externalCamera);
}