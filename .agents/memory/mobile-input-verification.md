---
name: Mobile input verification
description: Multi-touch ownership and limits of browser verification for this camera app.
---

Treat aiming and firing as independent touches rather than competing React Native responders.

**Why:** A joystick can pass a one-pointer browser test while capturing the native responder and preventing a second finger from firing. Dispatching artificial DOM pointer events is also not equivalent to a browser-owned pointer: pointer capture rejects invented active IDs.

**How to apply:** For changes to combined controls, check two real browser touch IDs (or physical native touches), not only mouse drags and separate clicks. Synthetic camera streams verify UI behavior, not rear-camera permissions, audio output, or native-device performance. State those limits when reporting results.