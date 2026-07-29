package com.indwella_client

import android.app.Activity
import android.content.Intent
import android.database.Cursor
import android.provider.ContactsContract
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

class PhoneContactPickerModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private var pendingPromise: Promise? = null

  private val activityEventListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity?,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
      ) {
        if (requestCode != PICK_CONTACT_REQUEST) {
          return
        }

        val promise = pendingPromise ?: return
        pendingPromise = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
          promise.reject("contact_picker_cancelled", "No contact selected")
          return
        }

        val uri = data.data
        val projection = arrayOf(
          ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
          ContactsContract.CommonDataKinds.Phone.NUMBER
        )

        var cursor: Cursor? = null
        try {
          cursor = reactContext.contentResolver.query(uri!!, projection, null, null, null)
          if (cursor != null && cursor.moveToFirst()) {
            val nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            val result = WritableNativeMap()
            result.putString("name", if (nameIndex >= 0) cursor.getString(nameIndex) else "")
            result.putString("phone", if (numberIndex >= 0) cursor.getString(numberIndex) else "")
            promise.resolve(result)
          } else {
            promise.reject("contact_picker_empty", "Selected contact has no phone number")
          }
        } catch (error: Exception) {
          promise.reject("contact_picker_error", error.message, error)
        } finally {
          cursor?.close()
        }
      }
    }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "PhoneContactPicker"

  @ReactMethod
  fun pickContact(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("activity_unavailable", "No active activity")
      return
    }

    if (pendingPromise != null) {
      promise.reject("contact_picker_busy", "Contact picker is already open")
      return
    }

    pendingPromise = promise
    val intent = Intent(
      Intent.ACTION_PICK,
      ContactsContract.CommonDataKinds.Phone.CONTENT_URI
    )
    activity.startActivityForResult(intent, PICK_CONTACT_REQUEST)
  }

  companion object {
    private const val PICK_CONTACT_REQUEST = 8421
  }
}
