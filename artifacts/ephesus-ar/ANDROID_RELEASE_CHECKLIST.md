# Android Google Play AAB preparation checklist

This artifact is **prepared for later release work, not release-configured or
release-verified**. No Android build, SDK installation, store submission, or
device test was run in this workspace. The checked-in release helpers validate
configuration and finished artifacts; they do not create or sign an APK/AAB.
The checked-in source of truth is `app.json`; the generated `android/` directory
is ignored and must be regenerated before producing an AAB.

## What is already aligned

- App identity: `Red Zone AR`, package `com.ephesusmedya.redzonear`, scheme
  `red-zone-ar`, portrait orientation, version `1.0.0`, version code `1`.
- The 1024×1024 `red-zone-ar-icon.png` is configured as the app icon.
- Camera is the only user-facing runtime permission. Microphone recording is
  disabled in both the camera/audio plugins and blocked in Android config.
- Location, external storage, and overlay permissions are blocked because the
  app does not use those features. Audio playback and haptics remain available.
- Android app backup is disabled by supported Expo config. A local
  `withAndroidReleaseManifest` config plugin also writes
  `android:usesCleartextTraffic="false"` because Expo static-config
  introspection does not emit a `usesCleartextTraffic` attribute from
  `app.json`. The same plugin injects a Gradle release-signing guard: release
  tasks require protected `ANDROID_UPLOAD_*` variables and use a dedicated
  upload keystore instead of the debug key. The debug manifest may still
  enable cleartext traffic; it must never be used as a release artifact.

The existing generated manifest was audited against `app.json`: its identity,
label, scheme, orientation, camera permission, and version values match. It was
generated before the permission/backup updates and still shows stale location,
storage, and overlay entries, has `allowBackup="true"`, and has no release
cleartext attribute. Regenerate through the local config plugin rather than
hand-editing the ignored native tree. The generated project must contain the
release-signing guard before any release task is run.

## Required before the first AAB

- **Production API:** provide a real HTTPS `EXPO_PUBLIC_API_URL` at bundle time
  and run `pnpm validate:release` from this artifact. Do not ship a Replit
  preview/dev host, a host-only value, or a placeholder. The runtime config
  refuses a missing/invalid production endpoint. Confirm the production API,
  authentication, persistence, and failure behavior independently.
- **Physical-device test APK:** use a separate test-only environment, for
  example set `EXPO_PUBLIC_APP_ENV=test` and
  `EXPO_PUBLIC_API_URL=https://<known-dev-host>`, then run
  `pnpm validate:test`. The endpoint must be explicit and HTTPS; never reuse
  `EXPO_PUBLIC_APP_ENV=production` for a dev server. A local HTTP endpoint is
  intentionally not accepted by the test guard, so use a trusted HTTPS tunnel
  or dev deployment instead. This is configuration guidance only; no APK was
  built here.
- **Signing:** configure a Play App Signing account and a protected upload
  keystore in the approved Android build environment. Regenerate native files
  so the plugin's Gradle guard is present, then provide
  `ANDROID_UPLOAD_KEYSTORE_PATH`, `ANDROID_UPLOAD_KEYSTORE_PASSWORD`,
  `ANDROID_UPLOAD_KEY_ALIAS`, and `ANDROID_UPLOAD_KEY_PASSWORD` only through
  protected build secrets. `--release` artifact verification also requires the
  owner-approved upload certificate SHA-256 allowlist through
  `ANDROID_UPLOAD_CERT_SHA256` (comma-separated) or repeated
  `--certificate-sha256` arguments. Never use `android/app/debug.keystore`,
  commit keystore material, or treat a debug-signed output as a release.
- **Test-only QA APK:** a standalone test APK may intentionally use the Android
  debug signer, but only when both `EXPO_PUBLIC_APP_ENV=test` and
  `ANDROID_QA_TEST_SIGNING=true` are set. The Gradle guard rejects QA signing
  for bundles, and this APK must never be uploaded to Play. Verify its page and
  ELF alignment without `--release`; `--release` is reserved for the approved
  upload-signed artifact. Once the native project exists, set
  `EXPO_PUBLIC_APP_ENV=test` and `ANDROID_QA_TEST_SIGNING=true`, then run
  `./gradlew :app:assembleRelease`.
- **Regenerate native configuration:** regenerate the Android project from this
  `app.json` and the local config plugin, then inspect the **release merged
  manifest**. Confirm that only the intended permissions remain,
  `android:allowBackup="false"` and `android:usesCleartextTraffic="false"` are
  present, and that the debug cleartext override is not part of release.
- **Store/privacy declarations:** publish a real privacy-policy URL and complete
  Google Play Data safety, content rating, target-audience, app-access, and
  permissions declarations. The in-app settings disclosure now describes
  on-device camera processing, local preferences/simulation state, and the
   local preferences and simulation state. It does not invent a developer identity, contact, URL, retention
  period, or server policy. The in-app copy is not a substitute for a public
  policy URL; the URL, support contact, legal developer identity, retention,
  and controller/processor details remain owner input blockers.
- **Ads and payments:** this build has no ad SDK and labels its reward flow as a
  simulation; its credit/gold panels state that payments are unavailable.
  Declare no live ads or purchases unless real services are integrated, tested,
  and the listing is updated. Do not imply that simulated rewards are monetized.
- **Listing assets:** prepare final store description, screenshots showing the
  camera permission rationale, age/content rating, support contact, and
  developer identity. Review the camera-based weapons simulation against Play
  content policies before submission.

## 16 KB page-size gate

Source configuration cannot prove 16 KB compatibility. The current project
resolution is NDK 27.1; that resolved toolchain version (including its exact
patch) must be recorded for the eventual build, but it is not a binary
compatibility claim and is not an arbitrary r28 pin. After a signed AAB exists,
set `ANDROID_UPLOAD_CERT_SHA256=<approved-sha256>` and run
`pnpm verify:android path/to/app.aab --release` to verify bundle configuration reports
`PAGE_ALIGNMENT_16K`, an actual signer certificate, and an allowlisted upload
certificate. Run the same helper against a generated APK to execute
`zipalign -c -P 16 -v 4`; its direct parser also checks every packaged `.so`
ELF's PT_LOAD alignment across ELF32/ELF64 and byte orders. This ELF check is
not proof of device compatibility. Then test the installed release on a 16 KB
Android device/emulator. Record the exact AAB/APK, native dependency, Android
Gradle Plugin, NDK, and device/emulator versions. Do not mark this gate
complete from source or resolved-toolchain inspection alone.

## Binary and device verification

- Run the configuration gate from this artifact before a release build:
  `pnpm validate:release`. It must be run with the owner-supplied production
  API URL; there is intentionally no checked-in fallback.
- After building an APK/AAB in the approved Android environment, set
  `ANDROID_UPLOAD_CERT_SHA256=<approved-sha256>` and run
  `pnpm verify:android path/to/artifact.apk --release` (and the corresponding
  AAB command). A passing source check is not evidence that a binary passed. The verifier
  rejects unsigned JARs even when `jarsigner` exits zero, rejects unapproved
  certificate fingerprints (including any rogue additional signer), and rejects
  a wrong ELF PT_LOAD alignment. Certificate lineage/proof-of-rotation output
  is intentionally unsupported when ambiguous and fails closed.

## Final binary and device checks

Before production submission, inspect the actual signed AAB with the Android
bundle inspection tools, install the release (not debug) on representative
phones, and exercise first launch, camera grant/denial/settings recovery,
portrait orientation, offline behavior, background/return,
and the store/payment simulation. Upload to a Play internal-testing track first
and resolve Play pre-launch, policy, manifest, and 16 KB warnings. An AAB
binary, real-device verification, a public privacy policy, owner-supplied
 developer/support details, and the listed release checks are still blockers
for claiming Play readiness.

Policy reference checked for this checklist:
<https://support.google.com/googleplay/android-developer/answer/11926878?hl=en>.
That page currently states that, starting **August 31, 2026**, new apps and
updates must target Android 16 (API level 36) or higher (with a possible
extension to November 1, 2026). Confirm the requirement again when submitting.