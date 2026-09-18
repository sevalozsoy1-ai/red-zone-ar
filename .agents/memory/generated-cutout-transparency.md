---
name: Generated cutout transparency
description: A visual verification rule for generated weapon and product cutouts used over the live camera.
---

Generated PNG cutouts must be visually checked inside the app; requesting background removal during generation is not proof that the pixels are actually transparent.

**Why:** A generated first-person weapon batch returned PNG files whose checkerboard transparency preview was baked into opaque pixels. Static format checks passed, but the pattern became visible over the camera.

**How to apply:** After generating camera-overlay assets, inspect a running-app screenshot and verify corner alpha. If the checkerboard is visible, run the dedicated background-removal pass before wiring or delivering the assets.