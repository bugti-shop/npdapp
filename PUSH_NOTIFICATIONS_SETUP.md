# Push Notifications Setup for Android

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications on Android.

## Prerequisites

- Firebase project (already configured: `npd-all-in-one-notepad`)
- Android Studio installed
- Project exported to GitHub

## Step 1: Add Firebase Cloud Messaging to Android

1. After running `npx cap sync android`, open the project in Android Studio
2. The `google-services.json` file should already be in `android/app/`

## Step 2: Update Android Manifest

Open `android/app/src/main/AndroidManifest.xml` and ensure these permissions are present:

```xml
<!-- Push Notification Permissions -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Inside <application> tag -->
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="task_reminders" />
```

## Step 3: Add Notification Channel (Optional but Recommended)

For Android 8.0+, create a notification channel. Add this to `MainActivity.java`:

```java
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

@Override
public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        NotificationChannel channel = new NotificationChannel(
            "task_reminders",
            "Task Reminders",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Notifications for task reminders");
        
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        notificationManager.createNotificationChannel(channel);
    }
}
```

## Step 4: Build and Test

```bash
# Sync the project
npx cap sync android

# Run on device/emulator
npx cap run android
```

## How Push Notifications Work

### Local Notifications (Already Implemented)
- Used for scheduled reminders (task due dates, note reminders)
- Work offline without internet
- Triggered by the app based on scheduled times

### Push Notifications (Server-Sent)
- Used for real-time updates from a server
- Requires internet connection
- Can be sent even when app is closed

### Current Implementation

The app uses **Capacitor's Local Notifications** for:
- Task reminders
- Note reminders
- Snooze functionality

And **Capacitor's Push Notifications** for:
- Future server-side notifications (e.g., shared task updates)
- Cross-device sync notifications

## Testing Push Notifications

1. Enable push notifications in Settings
2. The app will register with FCM and receive a token
3. Use Firebase Console to send test notifications:
   - Go to Firebase Console → Cloud Messaging
   - Click "Send your first message"
   - Enter title and body
   - Select your app
   - Send

## Troubleshooting

### Notifications Not Showing

1. Check if notifications are enabled in device settings
2. Verify the app has notification permissions
3. Check logcat for errors: `adb logcat | grep -i push`

### Token Not Generated

1. Ensure `google-services.json` is correctly placed
2. Check internet connection
3. Rebuild the app: `npx cap sync android && npx cap run android`

### Notifications Only in Foreground

1. Ensure proper notification channel is created
2. Check that `MainActivity` properly handles notifications
3. Verify Firebase dependencies in `build.gradle`
