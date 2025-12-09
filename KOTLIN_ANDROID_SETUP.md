# Setting Up Android with Kotlin (Instead of Java)

## The Problem
By default, when you run `npx cap add android`, Capacitor generates an Android project using Java. To use Kotlin instead, you need to either:
1. Add Android with a specific flag, OR
2. Delete the existing Android folder and re-add it

## Solution 1: Fresh Android Setup with Kotlin

If you haven't added Android yet, or want to start fresh:

```bash
# Remove existing Android folder if present
rm -rf android

# Add Android platform with Kotlin support
npx cap add android --package-id=app.lovable.70d65a0320744d6a9764003436c73c92

# After adding, the project will use Java by default
# You'll need to manually convert or follow Solution 2
```

## Solution 2: Convert Existing Project to Kotlin

### Step 1: Open in Android Studio
```bash
npx cap open android
```

### Step 2: Convert Java to Kotlin in Android Studio
1. In Android Studio, right-click on `MainActivity.java` 
2. Select **Code > Convert Java File to Kotlin File** (or press `Ctrl+Alt+Shift+K` / `Cmd+Option+Shift+K`)
3. Android Studio will ask to configure Kotlin - click **OK**
4. The file will be converted to `MainActivity.kt`

### Step 3: Update build.gradle (Project Level)
In `android/build.gradle`, add Kotlin support:

```gradle
buildscript {
    ext {
        kotlinVersion = '1.9.20'  // Use latest stable version
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.1'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"
        // ... other dependencies
    }
}
```

### Step 4: Update build.gradle (App Level)
In `android/app/build.gradle`, add at the top:

```gradle
plugins {
    id 'com.android.application'
    id 'kotlin-android'  // Add this line
}

android {
    // ... existing config
    
    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlinVersion"
    // ... other dependencies
}
```

### Step 5: Sync and Build
```bash
# Sync project files
npx cap sync android

# Build the project
cd android && ./gradlew assembleDebug
```

## Solution 3: Use a Kotlin Template (Recommended for New Projects)

The cleanest approach is to create a fresh Android project with Kotlin from the start:

```bash
# 1. Remove existing Android folder
rm -rf android

# 2. Sync with Capacitor (without adding Android)
npx cap sync

# 3. Create the Android project manually with Android Studio
#    File > New > New Project > Empty Activity
#    Select Kotlin as the language
#    Package name: app.lovable.70d65a0320744d6a9764003436c73c92

# 4. Then copy Capacitor's native files into it
```

## App Not Installing - Common Issues

### Issue 1: App Not Appearing After Install
If the app shows "installed" but doesn't appear:

1. **Check the package ID matches**: Ensure `capacitor.config.ts` has the correct `appId`
2. **Clear previous installations**:
   ```bash
   adb uninstall app.lovable.70d65a0320744d6a9764003436c73c92
   ```
3. **Rebuild completely**:
   ```bash
   cd android && ./gradlew clean
   npm run build
   npx cap sync android
   npx cap run android
   ```

### Issue 2: WebView Not Loading
If the app opens but shows a blank screen:

1. **Check server URL**: In `capacitor.config.ts`, ensure the URL is correct
2. **For production**: Remove or comment out the `server` block:
   ```typescript
   // server: {
   //   url: '...',
   //   cleartext: true
   // },
   ```
3. **Run build first**:
   ```bash
   npm run build
   npx cap sync android
   ```

### Issue 3: Mixed Content Errors
Add to `capacitor.config.ts`:
```typescript
android: {
  allowMixedContent: true
}
```

## Complete Setup Commands

```bash
# 1. Export project to GitHub and git pull locally

# 2. Install dependencies
npm install

# 3. Build the web app
npm run build

# 4. Remove old Android folder (if exists)
rm -rf android

# 5. Add Android platform
npx cap add android

# 6. Update native dependencies
npx cap update android

# 7. Sync project
npx cap sync android

# 8. Open in Android Studio and convert to Kotlin
npx cap open android

# 9. In Android Studio: Convert MainActivity.java to Kotlin
#    Code > Convert Java File to Kotlin File

# 10. Build and run
npx cap run android
```

## Verifying Installation

After running on device/emulator:
1. Check if app icon appears in app drawer
2. Open the app and verify content loads
3. Check Android Studio's Logcat for any errors

If still having issues, check Logcat in Android Studio for specific error messages.
