package expo.modules.backgroundshake

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlin.math.abs

class ShakeService : Service(), SensorEventListener {
    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    
    private var shakeCount = 0
    private var lastShakeTime: Long = 0
    private val SHAKE_THRESHOLD = 2.0f * SensorManager.GRAVITY_EARTH // Equivalent to 2.0 G total force in react native
    private val SHAKE_RESET_INTERVAL = 5000L
    private val MIN_SHAKE_COUNT = 3

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("ShakeService", "Service starting...")
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, "shake_service_channel")
            .setContentTitle("InstaAid Protection Active")
            .setContentText("Monitoring for emergency shakes in the background.")
            .setSmallIcon(resources.getIdentifier("ic_launcher", "mipmap", packageName))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setOngoing(true)
            .build()
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(1, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(1, notification)
            }
            Log.d("ShakeService", "Service started as foreground")
        } catch (e: Exception) {
            Log.e("ShakeService", "Could not start foreground service", e)
        }
 
        // Register Sensor with a higher frequency for better background detection
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
            Log.d("ShakeService", "Accelerometer listener registered")
        }
 
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            // same threshold logic as React Native totalForce > 2.0 (g? no, their logic was Math.abs(x)+y+z. Wait, Standard Android accel values are in m/s^2, meaning resting is 9.8 (1G). They had threshold "2.0". Wait, expo-sensors normalize accel to Gs! Native Android returns m/s^2.
            // React Native expo-sensors: values are in G's (1G = 9.81m/s2).
            // Their check: totalForce = abs(x) + abs(y) + abs(z) > 2.0 (G's)
            // So native: abs(x/9.81) + abs(y/9.81) + abs(z/9.81) > 2.0
            val forceInG = (abs(x) + abs(y) + abs(z)) / SensorManager.GRAVITY_EARTH

            if (forceInG > 2.0f) {
                val now = System.currentTimeMillis()
                if (now - lastShakeTime > SHAKE_RESET_INTERVAL) {
                    shakeCount = 0
                }
                shakeCount++
                lastShakeTime = now

                if (shakeCount >= MIN_SHAKE_COUNT) {
                    shakeCount = 0
                    sendEmergencySms()
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) { }

    private fun sendEmergencySms() {
        try {
            val prefs = getSharedPreferences("BackgroundShakePrefs", Context.MODE_PRIVATE)
            val contactsString = prefs.getString("contacts", "") ?: ""
            // We use the stored message as a fallback, but we will dynamically generate one if we can get location
            var finalMessage = prefs.getString("message", "🚨 EMERGENCY! I need help!") ?: "🚨 EMERGENCY! I need help!"

            val contacts = contactsString.split(",").filter { it.isNotBlank() }
            if (contacts.isEmpty()) {
                Log.w("ShakeService", "No emergency contacts configured.")
                return
            }

            try {
                val locationManager = getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
                val provider = android.location.LocationManager.GPS_PROVIDER // or NETWORK_PROVIDER
                val location = locationManager.getLastKnownLocation(provider)
                    ?: locationManager.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)

                if (location != null) {
                    val locationUrl = "https://maps.google.com/?q=\${location.latitude},\${location.longitude}"
                    finalMessage = "🚨 EMERGENCY! I need help! My live location: \$locationUrl"
                }
            } catch (e: SecurityException) {
                Log.e("ShakeService", "Location permission denied for background shake service", e)
            }

            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            for (phone in contacts) {
                val rawPhone = phone.trim()
                if (rawPhone.isNotBlank()) {
                    val cleanedPhone = rawPhone.replace(Regex("[^0-9+]"), "")
                    if (cleanedPhone.isNotBlank()) {
                         val parts = smsManager.divideMessage(finalMessage)
                         smsManager.sendMultipartTextMessage(cleanedPhone, null, parts, null, null)
                         Log.i("ShakeService", "Emergency SMS directly sent to $cleanedPhone")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("ShakeService", "Failed to send direct SMS: ${e.message}", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "shake_service_channel",
                "Shake Detection Background",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Runs background shake monitoring for emergency situations."
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
