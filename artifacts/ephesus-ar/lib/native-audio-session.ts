import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

import { createAudioSessionQueue } from '@/lib/audio-session-queue';

/**
 * expo-audio's mode is process-wide. Keeping this behind one serialized
 * session coordinator prevents the menu and battle hooks from racing two
 * independent mode updates when a screen transition mounts/unmounts them.
 */
const NATIVE_AUDIO_MODE = {
  allowsRecording: false,
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  interruptionMode: 'mixWithOthers' as const,
};

let configured = false;
let active = false;
const sessionQueue = createAudioSessionQueue();

async function configureAndActivate(forceActivation: boolean): Promise<void> {
  if (!configured) {
    await setAudioModeAsync(NATIVE_AUDIO_MODE);
    configured = true;
  }
  // setIsAudioActiveAsync(true) is intentionally separate from mode setup.
  // It is cheap on Android (where mixWithOthers does not request audio focus)
  // and can recover an iOS AVAudioSession after an interruption that did not
  // produce an AppState transition.
  if (forceActivation || !active) {
    await setIsAudioActiveAsync(true);
    active = true;
  }
}

/**
 * Configure and activate the shared native audio session.
 *
 * The function is intentionally idempotent. Both menu and weapon audio can
 * call it for the same gesture without one hook undoing the other's mode.
 */
export function ensureNativeAudioSession(): Promise<void> {
  return sessionQueue.enqueue(() => configureAndActivate(false));
}

/**
 * Re-assert only the active flag for a user gesture. This deliberately does
 * not call setAudioModeAsync per shot: the mode is configured once and the
 * active call handles OS-level interruptions even when AppState stays active.
 */
export function activateNativeAudioSession(): Promise<void> {
  return sessionQueue.enqueue(() => configureAndActivate(true));
}

/**
 * Stop native audio while the app is backgrounded. Players remain owned by
 * their hooks and can be resumed after the next foreground transition.
 */
export function suspendNativeAudioSession(): Promise<void> {
  return sessionQueue.enqueue(async () => {
    active = false;
    await setIsAudioActiveAsync(false);
  });
}
