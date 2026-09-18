---
name: Android APK build environment
description: Local native APK builds can be blocked by Replit workspace quotas and Gradle/NDK daemon instability.
---

Local Android release builds may fail even when the Expo project typechecks and the Android bundle exports successfully.

**Why:** The workspace has repeatedly reported `Disk quota exceeded` while downloading Gradle/Maven artifacts despite free space shown by `df`, and the Gradle daemon has also crashed during React Native CMake work. This is an environment limitation, not evidence of an application compile error.

**How to apply:** Do not provide an APK link unless an actual APK exists and can be inspected. Moving Gradle caches to `/tmp` did not bypass the quota; `/dev/shm` also failed with a disappearing daemon. Do not repeat these attempts without a material environment change. Verify available Android build tooling rather than assuming Expo Launch supports Android: public Android build documentation and the session's Expo skill can differ, and a documented flow is not evidence that this session exposes its tools.

For temporary Nix SDKs, the Android license flag belongs on the `androidenv` package import, not on `composeAndroidPackages`; Expo's Android project may also require multiple build-tools versions and the exact NDK side-by-side version before Gradle reaches compilation. Even with those components present, a React Native debug build can still lose its Gradle daemon during dex/native work.

**Why:** The Nix package interface rejects `licenseAccepted` on the compose call, and Expo requested components that were not in a minimal SDK. The completed configuration phase followed by a disappeared daemon showed that satisfying SDK discovery is separate from having enough workspace resources for the full build.

**How to apply:** Resolve the project's declared compile/target/build-tools/NDK requirements before retrying. Treat a disappeared daemon after substantial compilation as an environment capacity failure, not as a reason to repeatedly rerun the same build.

Expo accepting a configuration property does not prove that property appears in
the Android manifest.

**Why:** A direct Android cleartext setting was silently absent from Expo's
introspected manifest despite resolving in the configuration.

**How to apply:** Verify manifest-related release settings through introspection
and the eventual merged release manifest, not JSON parsing alone.