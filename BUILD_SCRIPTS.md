# Build Scripts Documentation

This project includes automated build scripts for Android and iOS platforms.

## Quick Start

```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Build Android (debug)
./scripts/build-android.sh

# Build Android (release)
./scripts/build-android.sh release

# Build iOS (debug) - macOS only
./scripts/build-ios.sh

# Build iOS (release) - macOS only
./scripts/build-ios.sh release

# Build both platforms
./scripts/build-all.sh

# Clean all builds
./scripts/clean.sh
```

## Scripts Overview

### `build-android.sh`

Automates the Android build process:
1. Installs npm dependencies
2. Builds the web application
3. Adds Android platform (if not exists)
4. Updates and syncs Capacitor
5. Builds APK (debug or release)
6. Optionally installs on connected device

**Usage:**
```bash
./scripts/build-android.sh         # Debug build
./scripts/build-android.sh release # Release build
```

**Output:**
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

### `build-ios.sh`

Automates the iOS build process (requires macOS):
1. Installs npm dependencies
2. Builds the web application
3. Adds iOS platform (if not exists)
4. Updates and syncs Capacitor
5. Installs CocoaPods dependencies
6. Builds the app (debug or release)
7. Optionally runs on simulator

**Usage:**
```bash
./scripts/build-ios.sh         # Debug build
./scripts/build-ios.sh release # Release archive
```

### `build-all.sh`

Builds both Android and iOS in one command:
- Always builds Android
- Only builds iOS on macOS

**Usage:**
```bash
./scripts/build-all.sh         # Debug builds
./scripts/build-all.sh release # Release builds
```

### `clean.sh`

Cleans all build artifacts:
- Removes `dist/` folder
- Optionally removes `node_modules/`
- Cleans Android build and optionally removes `android/`
- Cleans iOS build and optionally removes `ios/`

## Prerequisites

### Android Requirements
- Node.js and npm
- Java JDK 17+
- Android SDK (via Android Studio)
- ADB (for device installation)

### iOS Requirements
- macOS
- Node.js and npm
- Xcode
- CocoaPods (`sudo gem install cocoapods`)

## Release Build Setup

### Android Release Keystore

Create a release keystore for signed APKs:

```bash
keytool -genkey -v \
  -keystore android/app/release-keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias release
```

Then create `android/app/keystore.properties`:
```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=release
storeFile=release-keystore.jks
```

Update `android/app/build.gradle`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('app/keystore.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### iOS Signing

1. Open Xcode: `npx cap open ios`
2. Select your project in the navigator
3. Go to "Signing & Capabilities"
4. Select your Team
5. Xcode will automatically manage provisioning

## Troubleshooting

### Android: "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=/path/to/Android/sdk
```

### Android: Gradle build fails
```bash
cd android && ./gradlew clean && cd ..
./scripts/build-android.sh
```

### iOS: Pod install fails
```bash
cd ios/App
pod repo update
pod install
cd ../..
```

### iOS: Signing issues
- Ensure you're logged into Xcode with your Apple ID
- Check that your provisioning profile matches the bundle ID

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

### GitHub Actions Example

```yaml
name: Build Mobile Apps

on:
  push:
    branches: [main]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Build Android
        run: |
          chmod +x scripts/build-android.sh
          ./scripts/build-android.sh release

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Build iOS
        run: |
          chmod +x scripts/build-ios.sh
          ./scripts/build-ios.sh release
```
