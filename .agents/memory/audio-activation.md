---
name: Audio activation
description: Avoid first-interaction audio races and distinguish playback verification from hardware audibility.
---

Do not unlock browser audio by silently playing and then pausing the same players used for effects. Unlock the audio engine itself.

**Why:** The first gesture may both unlock sound and fire a weapon. Asynchronous warm-up callbacks can mute, rewind, or stop that actual shot while playback promises still report success.

**How to apply:** Preserve gesture-triggered engine activation and independent per-shot playback. Verify asset decoding, a running context, and output connections; a resolved play promise alone does not establish audible output. Provide a sound-test control independent of camera permission.

Native interruption recovery must be described separately from player activation.

**Why:** In the inspected expo-audio Android implementation, `mixWithOthers` skips AudioManager focus requests. Re-enabling the audio module is not proof of focus reacquisition or audible recovery after a phone call. On iOS, short effects can deactivate the shared session unless session retention is enabled.

**How to apply:** Recheck installed SDK behavior when changing interruption modes; verify repeated shots and background/foreground recovery on an actual phone before claiming the Expo Go sound-loss issue is fully resolved.