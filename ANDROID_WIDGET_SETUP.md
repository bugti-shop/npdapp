# Android Widget Setup for Today's Tasks

This guide explains how to add a home screen widget to display today's tasks on Android.

## Overview

Android widgets for Capacitor apps require native code. We'll create:
1. A widget layout (XML)
2. A widget provider class (Kotlin/Java)
3. Widget metadata

## Step 1: Create Widget Layout

Create `android/app/src/main/res/layout/widget_today_tasks.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@drawable/widget_background">

    <TextView
        android:id="@+id/widget_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Today's Tasks"
        android:textSize="16sp"
        android:textStyle="bold"
        android:textColor="#1a1a1a" />

    <TextView
        android:id="@+id/widget_date"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textSize="12sp"
        android:textColor="#666666"
        android:layout_marginBottom="8dp" />

    <ListView
        android:id="@+id/widget_task_list"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:divider="@null"
        android:dividerHeight="4dp" />

    <TextView
        android:id="@+id/widget_empty"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="No tasks for today!"
        android:textSize="14sp"
        android:textColor="#888888"
        android:gravity="center"
        android:visibility="gone" />

</LinearLayout>
```

## Step 2: Create Widget Background Drawable

Create `android/app/src/main/res/drawable/widget_background.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="#ffffff" />
    <corners android:radius="16dp" />
    <stroke android:width="1dp" android:color="#e0e0e0" />
</shape>
```

## Step 3: Create Widget Item Layout

Create `android/app/src/main/res/layout/widget_task_item.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="horizontal"
    android:padding="8dp"
    android:background="?android:attr/selectableItemBackground">

    <CheckBox
        android:id="@+id/task_checkbox"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:clickable="false"
        android:focusable="false" />

    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_weight="1"
        android:orientation="vertical"
        android:layout_marginStart="8dp">

        <TextView
            android:id="@+id/task_text"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textSize="14sp"
            android:textColor="#1a1a1a"
            android:maxLines="2"
            android:ellipsize="end" />

        <TextView
            android:id="@+id/task_time"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textSize="12sp"
            android:textColor="#666666"
            android:visibility="gone" />

    </LinearLayout>

    <View
        android:id="@+id/priority_indicator"
        android:layout_width="4dp"
        android:layout_height="match_parent"
        android:layout_marginStart="8dp"
        android:background="#3b82f6" />

</LinearLayout>
```

## Step 4: Create Widget Metadata

Create `android/app/src/main/res/xml/widget_info.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:initialLayout="@layout/widget_today_tasks"
    android:minWidth="250dp"
    android:minHeight="180dp"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:updatePeriodMillis="1800000"
    android:previewImage="@drawable/widget_preview"
    android:description="@string/widget_description">
</appwidget-provider>
```

## Step 5: Create Widget Provider

Create `android/app/src/main/java/app/nota/com/TodayTasksWidget.kt`:

```kotlin
package app.nota.com

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.app.PendingIntent
import java.text.SimpleDateFormat
import java.util.*

class TodayTasksWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget first created
    }

    override fun onDisabled(context: Context) {
        // Widget removed
    }

    companion object {
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_today_tasks)
            
            // Set today's date
            val dateFormat = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault())
            views.setTextViewText(R.id.widget_date, dateFormat.format(Date()))
            
            // Set up intent to open app when widget is tapped
            val intent = Intent(context, MainActivity::class.java).apply {
                putExtra("openRoute", "/todo/today")
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_title, pendingIntent)
            
            // Set up RemoteViews service for list
            val serviceIntent = Intent(context, TaskWidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            views.setRemoteAdapter(R.id.widget_task_list, serviceIntent)
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
```

## Step 6: Create Widget Service

Create `android/app/src/main/java/app/nota/com/TaskWidgetService.kt`:

```kotlin
package app.nota.com

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class TaskWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return TaskRemoteViewsFactory(applicationContext)
    }
}

class TaskRemoteViewsFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {
    
    private var tasks = mutableListOf<TaskItem>()
    
    data class TaskItem(
        val id: String,
        val text: String,
        val completed: Boolean,
        val priority: String?,
        val dueDate: Date?
    )
    
    override fun onCreate() {
        loadTasks()
    }
    
    override fun onDataSetChanged() {
        loadTasks()
    }
    
    private fun loadTasks() {
        tasks.clear()
        
        try {
            // Read tasks from SharedPreferences (synced from WebView)
            val prefs = context.getSharedPreferences("nota_tasks", Context.MODE_PRIVATE)
            val tasksJson = prefs.getString("today_tasks", "[]")
            
            val jsonArray = JSONArray(tasksJson)
            val today = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
            }.time
            
            val tomorrow = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
            }.time
            
            for (i in 0 until jsonArray.length()) {
                val task = jsonArray.getJSONObject(i)
                val dueDate = task.optString("dueDate")?.let {
                    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(it)
                }
                
                if (dueDate != null && dueDate >= today && dueDate < tomorrow && !task.optBoolean("completed", false)) {
                    tasks.add(TaskItem(
                        id = task.getString("id"),
                        text = task.getString("text"),
                        completed = task.optBoolean("completed", false),
                        priority = task.optString("priority"),
                        dueDate = dueDate
                    ))
                }
            }
            
            // Sort by due time
            tasks.sortBy { it.dueDate }
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    override fun onDestroy() {
        tasks.clear()
    }
    
    override fun getCount(): Int = tasks.size
    
    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_task_item)
        
        if (position < tasks.size) {
            val task = tasks[position]
            views.setTextViewText(R.id.task_text, task.text)
            
            // Set priority color
            val priorityColor = when (task.priority) {
                "high" -> 0xFFef4444.toInt()
                "medium" -> 0xFFf97316.toInt()
                "low" -> 0xFF22c55e.toInt()
                else -> 0xFF3b82f6.toInt()
            }
            views.setInt(R.id.priority_indicator, "setBackgroundColor", priorityColor)
            
            // Set time if available
            task.dueDate?.let {
                val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
                views.setTextViewText(R.id.task_time, timeFormat.format(it))
                views.setViewVisibility(R.id.task_time, android.view.View.VISIBLE)
            }
        }
        
        return views
    }
    
    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = position.toLong()
    override fun hasStableIds(): Boolean = true
}
```

## Step 7: Update AndroidManifest.xml

Add the widget components to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Inside <application> tag -->

<receiver android:name=".TodayTasksWidget"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info" />
</receiver>

<service android:name=".TaskWidgetService"
    android:permission="android.permission.BIND_REMOTEVIEWS"
    android:exported="false" />
```

## Step 8: Add String Resources

Add to `android/app/src/main/res/values/strings.xml`:

```xml
<string name="widget_description">Shows today\'s tasks at a glance</string>
```

## Step 9: Sync Tasks to Widget

Add this to your app to sync tasks to the widget. In your Capacitor plugin or WebView bridge:

```javascript
// Call this whenever tasks change
function syncTasksToWidget(tasks) {
  if (Capacitor.isNativePlatform()) {
    // Send tasks to native code
    Capacitor.Plugins.WidgetBridge?.updateTasks({ tasks });
  }
}
```

## Step 10: Build and Test

```bash
npx cap sync android
npx cap open android
```

Build the app in Android Studio, then:
1. Long-press on home screen
2. Select "Widgets"
3. Find "Nota" widget
4. Drag to home screen

## Widget Features

- Shows today's date
- Lists all tasks due today
- Color-coded priority indicators
- Tapping opens the app to Today view
- Auto-updates every 30 minutes
- Supports resizing

## Troubleshooting

### Widget Not Appearing
- Ensure the app is installed (not just running in dev mode)
- Check AndroidManifest.xml for proper receiver registration

### Tasks Not Loading
- Verify SharedPreferences sync from WebView
- Check logcat for errors: `adb logcat | grep Widget`

### Widget Not Updating
- Force update: `adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE`
