---
name: Android scope overlay safety
description: Native rendering constraints for the camera battle scope overlay
---

Camera battle scope overlays must stay within the current viewport and use bounded geometry. Do not allocate a multi-viewport SVG canvas just to create an off-screen mask; the camera parent already handles aim translation.

**Why:** Mounting a 3x off-screen SVG surface during scope activation can trigger Android memory or native rendering failures even when the normal camera view is stable.

**How to apply:** Derive lens radius from the smaller viewport dimension, clamp invalid zero dimensions, and keep the overlay's width and height equal to the viewport. Verify scope activation on a physical Android device before release.