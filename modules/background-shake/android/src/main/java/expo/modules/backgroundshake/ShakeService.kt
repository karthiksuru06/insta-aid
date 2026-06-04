package expo.modules.backgroundshake

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlin.math.abs

class ShakeService : Service(), SensorEventListener {
    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    
    private var lastUpdate: Long = 0
    private var last_x = 0f
    private var last_y = 0f
    private var last_z = 0f
    private var shakeCount = 0
    private var lastShakeTime: Long = 0
    private val SHAKE_THRESHOLD = 800f // Speed threshold to filter out normal bumps
    private val SHAKE_WINDOW = 2500L // 2.5 seconds to complete the shakes
    private val MIN_SHAKE_COUNT = 4

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        
        val notification = NotificationCompat.Builder(this, "shake_service_channel")
            .setContentTitle("Instaaid Emergency Monitor")
            .setContentText("Shake detection is active in the background.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
            
        startForeground(1, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL)
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ACCELEROMETER) {
            val curTime = System.currentTimeMillis()
            // Sample every 100ms
            if ((curTime - lastUpdate) > 100) {
                val diffTime = (curTime - lastUpdate)
                lastUpdate = curTime

                val x = event.values[0]
                val y = event.values[1]
                val z = event.values[2]

                // Calculate speed of change (jerk) to eliminate constant forces like gravity or car acceleration
                val speed = abs(x + y + z - last_x - last_y - last_z) / diffTime * 10000

                if (speed > SHAKE_THRESHOLD) {
                    val now = System.currentTimeMillis()
                    
                    // Reset if the shake sequence took too long
                    if (now - lastShakeTime > SHAKE_WINDOW) {
                        shakeCount = 0
                    }
                    
                    shakeCount++
                    lastShakeTime = now
                    Log.d("ShakeService", "Shake detected! Count: $shakeCount, Speed: $speed")

                    if (shakeCount >= MIN_SHAKE_COUNT) {
                        Log.i("ShakeService", "Emergency Shake Sequence Confirmed!")
                        shakeCount = 0
                        
                        // Emit event to React Native for UI confirmation if app is open
                        // For now, proceed to send SMS (Background fallback)
                        sendEmergencySms()
                    }
                }
                
                last_x = x
                last_y = y
                last_z = z
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) { }

    private fun sendEmergencySms() {
        try {
            val prefs = getSharedPreferences("BackgroundShakePrefs", Context.MODE_PRIVATE)
            val contactsString = prefs.getString("contacts", "") ?: ""
            var finalMessage = prefs.getString("message", "🚨 EMERGENCY! I need help!") ?: "🚨 EMERGENCY! I need help!"

            val contacts = contactsString.split(",").filter { it.isNotBlank() }
            if (contacts.isEmpty()) {
                Log.w("ShakeService", "No emergency contacts configured.")
                return
            }

            try {
                val locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
                val location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)

                if (location != null) {
                    val locationUrl = "https://maps.google.com/?q=${location.latitude},${location.longitude}"
                    finalMessage = "🚨 EMERGENCY! I need help! My live location: $locationUrl"
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

    override fun onBind(intent: Intent?): IBinder? = null
}