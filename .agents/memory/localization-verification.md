---
name: Localization verification
description: Semantic coverage and persisted startup checks for multilingual UI.
---

Translation key parity does not establish correct localization. Use purpose-specific labels and verify rendered workflows in multiple languages.

**Why:** Matching dictionaries once hid unrelated labels in the lobby, and a device-language initialization gate blocked returning users with persisted onboarding.

**How to apply:** Check both fresh and returning startup paths. Verify room actions, purchase amounts and combat controls semantically, not only dictionary completeness. Never substitute a vaguely related translated key for missing copy.

Startup animation timers must not restart when a parent callback identity changes.

**Why:** A periodic entitlement clock caused parent renders more frequently than the splash delay, repeatedly cancelling its timer and keeping startup open forever.

**How to apply:** Keep the completion callback in a ref and start the one-shot timer from stable readiness state; verify startup again when adding periodic context updates.