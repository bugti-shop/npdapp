# Android Deep Link Setup for Google OAuth

To enable Google Calendar OAuth callback handling on Android, you need to configure deep links in your Android project.

## Step 1: Update AndroidManifest.xml

After running `npx cap sync android`, open `android/app/src/main/AndroidManifest.xml` and add the following intent filter inside the `<activity>` tag:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="app.nota.com" />
</intent-filter>
```

## Step 2: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   - `app.nota.com://auth/google/callback` (for Android)
   - `https://your-app-url.com/auth/google/callback` (for web)

## Step 3: Sync and Rebuild

After making these changes:

```bash
npx cap sync android
npx cap run android
```

## How it works

1. When the user taps "Connect Google Calendar", the app opens the Google OAuth consent screen
2. After the user grants permission, Google redirects to `app.nota.com://auth/google/callback#access_token=...`
3. Android intercepts this custom URL scheme and opens the app
4. The app's GoogleAuthCallback page extracts the token and stores it
5. The user is redirected back to Settings

## Troubleshooting

If the OAuth redirect doesn't work:

1. Make sure the intent filter is correctly placed in AndroidManifest.xml
2. Verify the redirect URI in Google Cloud Console matches exactly
3. Check that you're using the correct OAuth Client ID (Web client type)
4. Clear app data and try again
