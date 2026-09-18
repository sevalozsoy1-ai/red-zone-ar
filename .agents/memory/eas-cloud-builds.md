---
name: EAS cloud builds
description: Requirements and boundaries for producing this Expo app's Android artifacts with EAS.
---

The cloud APK path is intentionally a separate `preview` EAS profile from the
`production` AAB profile. The preview build must receive an explicit HTTPS
`EXPO_PUBLIC_API_URL` through the EAS preview environment; a Replit preview
hostname is not a durable production endpoint.

**Why:** The app refuses missing or unsafe test/production API configuration at
runtime, and EAS cannot create or select an Expo project without user
authentication. The local Replit Git remote is not automatically a GitHub source
repository for an EAS build.

**How to apply:** Keep the app's EAS project ID linked by `eas init` rather than
inventing one. Before starting a cloud build, authenticate the Expo account,
connect the repository if the chosen EAS build runner requires it, and set the
preview/production API environment values. Verify the downloaded APK/AAB with
the project's Android artifact checker.