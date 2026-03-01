package expo.modules.backgroundshake

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.telephony.SmsManager
import android.os.Build
import android.content.Context
import java.net.URL

class BackgroundShakeModule : Module() {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    Name("BackgroundShake")
    Function("startService") { contacts: String, message: String ->
      val context = appContext.reactContext
      if (context != null) {
        val prefs = context.getSharedPreferences("BackgroundShakePrefs", android.content.Context.MODE_PRIVATE)
        prefs.edit().putString("contacts", contacts).putString("message", message).apply()

        val intent = android.content.Intent(context, ShakeService::class.java)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
      }
    }

    Function("stopService") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = android.content.Intent(context, ShakeService::class.java)
        context.stopService(intent)
      }
    }

    Function("sendSMS") { contacts: String, message: String ->
      val context = appContext.reactContext
      if (context != null) {
        try {
          val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
          } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
          }
 
          val phoneList = contacts.split(",").map { it.trim() }.filter { it.isNotBlank() }
          var successCount = 0
          for (rawPhone in phoneList) {
            val phone = rawPhone.replace(Regex("[^0-9+]"), "")
            if (phone.isNotBlank()) {
              val parts = smsManager.divideMessage(message)
              smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
              successCount++
            }
          }
          
          if (successCount > 0) {
            android.os.Handler(android.os.Looper.getMainLooper()).post {
              android.widget.Toast.makeText(context, "Direct SMS sent to $successCount contacts", android.widget.Toast.LENGTH_SHORT).show()
            }
            true
          } else {
            false
          }
        } catch (e: Exception) {
          android.util.Log.e("BackgroundShake", "sendSMS error: ${e.message}", e)
          android.os.Handler(android.os.Looper.getMainLooper()).post {
            android.widget.Toast.makeText(context, "SMS Error: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
          }
          false
        }
      } else {
        false
      }
    }
  }
}
