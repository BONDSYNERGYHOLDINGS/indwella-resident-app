package com.indwella_client

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PushNotificationModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "PushNotification"

  @ReactMethod
  fun show(title: String?, body: String?) {
    val notificationTitle = title?.takeIf { it.isNotBlank() } ?: reactContext.getString(R.string.app_name)
    val notificationBody = body?.takeIf { it.isNotBlank() } ?: return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val hasPermission = reactContext.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
      if (!hasPermission) {
        return
      }
    }

    val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Indwella notifications",
        NotificationManager.IMPORTANCE_DEFAULT
      )
      manager.createNotificationChannel(channel)
    }

    val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
      ?: Intent(reactContext, MainActivity::class.java)
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)

    val pendingIntent = PendingIntent.getActivity(
      reactContext,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      android.app.Notification.Builder(reactContext, CHANNEL_ID)
    } else {
      android.app.Notification.Builder(reactContext)
    }

    val notification = builder
      .setSmallIcon(reactContext.applicationInfo.icon)
      .setContentTitle(notificationTitle)
      .setContentText(notificationBody)
      .setStyle(android.app.Notification.BigTextStyle().bigText(notificationBody))
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .build()

    manager.notify(System.currentTimeMillis().toInt(), notification)
  }

  companion object {
    private const val CHANNEL_ID = "indwella_default"
  }
}
