---
name: Android 16 KB ABI selection
description: Native Android 16 KB page-size compatibility for Expo and React Native builds
---

For React Native Android builds that must support 16 KB memory pages, select only ABIs whose bundled native libraries pass 16 KB ELF alignment. Configure both React Native's architecture property and the app's NDK ABI filters; setting only one can still package incompatible 32-bit libraries.

**Why:** A preview build can otherwise include `armeabi-v7a` and `x86` libraries with 4 KB PT_LOAD alignment even when arm64 and x86_64 libraries are valid, causing the release check to fail.

**How to apply:** Keep `arm64-v8a` and `x86_64` for this app, verify native ZIP entry offsets and every ELF PT_LOAD alignment, and separately test installation on a real 16 KB Android device or compatible emulator.