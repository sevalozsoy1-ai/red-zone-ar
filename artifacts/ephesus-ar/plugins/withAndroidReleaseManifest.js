const {
  withAndroidManifest,
  withAppBuildGradle,
  withGradleProperties,
} = require('expo/config-plugins');

/**
 * `android.usesCleartextTraffic` is not emitted by Expo's static config
 * introspection. Keep this manifest policy and the release signing guard in a
 * local config plugin so they are applied whenever the ignored native project
 * is regenerated.
 */
function withAndroidReleaseManifest(config) {
  const withManifest = withAndroidManifest(config, (manifestConfig) => {
    const application = manifestConfig.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error('Android application manifest entry is missing');
    }

    application.$ = {
      ...(application.$ ?? {}),
      'android:allowBackup': 'false',
      'android:usesCleartextTraffic': 'false',
    };

    return manifestConfig;
  });

  const withArchitectures = withGradleProperties(withManifest, (propertiesConfig) => {
    const architectureProperty = propertiesConfig.modResults.find(
      (property) => property.type === 'property' && property.key === 'reactNativeArchitectures',
    );
    if (architectureProperty) {
      architectureProperty.value = 'arm64-v8a,x86_64';
    } else {
      propertiesConfig.modResults.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: 'arm64-v8a,x86_64',
      });
    }
    return propertiesConfig;
  });

  return withAppBuildGradle(withArchitectures, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;

    if (!contents.includes('redZoneReleaseSigningGuard')) {
      const signingGuard = `
// redZoneReleaseSigningGuard: release variants must use protected upload signing.
def redZoneReleaseStoreFile = System.getenv('ANDROID_UPLOAD_KEYSTORE_PATH')
def redZoneReleaseStorePassword = System.getenv('ANDROID_UPLOAD_KEYSTORE_PASSWORD')
def redZoneReleaseKeyAlias = System.getenv('ANDROID_UPLOAD_KEY_ALIAS')
def redZoneReleaseKeyPassword = System.getenv('ANDROID_UPLOAD_KEY_PASSWORD')
def redZoneReleaseSigningConfigured = [redZoneReleaseStoreFile, redZoneReleaseStorePassword, redZoneReleaseKeyAlias, redZoneReleaseKeyPassword].every { value -> value != null && !value.trim().isEmpty() }
def redZoneReleaseUsesDebugMaterial = (redZoneReleaseStoreFile ?: '').toLowerCase().contains('debug.keystore') ||
  (redZoneReleaseKeyAlias ?: '').toLowerCase() == 'androiddebugkey'
def redZoneReleaseTaskRequested = gradle.startParameter.taskNames.any { task -> task.toLowerCase().contains('release') }
def redZoneBuildEnvironment = (System.getenv('EXPO_PUBLIC_APP_ENV') ?: '').toLowerCase()
def redZoneQaTestSigning = redZoneBuildEnvironment == 'test' &&
  (System.getenv('ANDROID_QA_TEST_SIGNING') ?: '').toLowerCase() == 'true'
def redZoneBundleTaskRequested = gradle.startParameter.taskNames.any { task -> task.toLowerCase().contains('bundle') }
if (redZoneQaTestSigning && redZoneBundleTaskRequested) {
    throw new GradleException(
        'ANDROID_QA_TEST_SIGNING is only for a standalone test APK. ' +
        'It cannot produce a bundle or a Play-uploadable artifact.'
    )
}
if (redZoneReleaseTaskRequested && !redZoneQaTestSigning &&
    (!redZoneReleaseSigningConfigured || redZoneReleaseUsesDebugMaterial)) {
    throw new GradleException(
        'Release signing is missing or uses debug material. Set ANDROID_UPLOAD_KEYSTORE_PATH, ' +
        'ANDROID_UPLOAD_KEYSTORE_PASSWORD, ANDROID_UPLOAD_KEY_ALIAS, and ' +
        'ANDROID_UPLOAD_KEY_PASSWORD in the protected build environment. ' +
        'For a standalone QA APK only, use EXPO_PUBLIC_APP_ENV=test and ' +
        'ANDROID_QA_TEST_SIGNING=true. The Android debug keystore is never valid for production output.'
    )
}
`;
      const androidBlock = 'android {';
      const androidBlockIndex = contents.indexOf(androidBlock);
      if (androidBlockIndex < 0) {
        throw new Error('Android build.gradle is missing its android block');
      }
      contents = `${contents.slice(0, androidBlockIndex)}${signingGuard}\n${contents.slice(androidBlockIndex)}`;
    }

    if (!contents.includes('redZoneReleaseSigningConfigured')) {
      throw new Error('Release signing guard was not added to Android build.gradle');
    }

    if (!contents.includes('redZone16KbAbiFilters')) {
      const defaultConfigAnchor = '    defaultConfig {';
      const defaultConfigIndex = contents.indexOf(defaultConfigAnchor);
      if (defaultConfigIndex < 0) {
        throw new Error('Android build.gradle is missing its defaultConfig block');
      }
      const abiFilters = `    defaultConfig {
        // redZone16KbAbiFilters: ship only ABIs whose native libraries support 16 KB pages.
        ndk {
            abiFilters 'arm64-v8a', 'x86_64'
        }
`;
      contents = `${contents.slice(0, defaultConfigIndex)}${abiFilters}${contents.slice(defaultConfigIndex + defaultConfigAnchor.length)}`;
    }

    if (!contents.includes('redZone16KbAbiFilters')) {
      throw new Error('16 KB-compatible Android ABI filters were not added');
    }

    if (!contents.includes('redZoneReleaseSigningSelection')) {
      const releaseSigningConfig = `
        release {
            // Credentials are read only from the protected build environment.
            if (redZoneReleaseSigningConfigured) {
                storeFile file(redZoneReleaseStoreFile)
                storePassword redZoneReleaseStorePassword
                keyAlias redZoneReleaseKeyAlias
                keyPassword redZoneReleaseKeyPassword
            }
        }
`;
      const signingConfigsAnchor = '    }\n    buildTypes {';
      const signingConfigsIndex = contents.indexOf(signingConfigsAnchor);
      if (signingConfigsIndex < 0) {
        throw new Error('Android build.gradle is missing its signingConfigs block');
      }
      contents = `${contents.slice(0, signingConfigsIndex)}${releaseSigningConfig}\n${contents.slice(signingConfigsIndex)}`;
      const releaseBuildType = /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
      contents = contents.replace(
        releaseBuildType,
        '$1signingConfig (redZoneQaTestSigning ? signingConfigs.debug : signingConfigs.release)\n            // redZoneReleaseSigningSelection',
      );
    }

    if (!contents.includes('redZoneReleaseSigningSelection')) {
      throw new Error('Release build type is still using an unexpected signing configuration');
    }

    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });
}

module.exports = withAndroidReleaseManifest;