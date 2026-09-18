---
name: Camera preview quality
description: Expo focus semantics and capture performance tradeoffs for camera battle.
---

Keep preview quality separate from marker-analysis capture requirements; avoid both the smallest capture preset and repeated maximum-resolution stills.

**Why:** Repeated high-resolution still captures compete with preview performance. Expo Camera's autofocus naming is counterintuitive: on iOS, `on` locks after one focus operation while `off` allows continuous adjustment.

**How to apply:** Check the installed SDK's focus semantics when changing camera settings; use bounded analysis capture dimensions and validate actual focus and preview quality on physical devices, not browser screenshots.