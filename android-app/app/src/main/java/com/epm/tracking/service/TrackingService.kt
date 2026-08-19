package com.epm.tracking.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import androidx.core.app.NotificationCompat
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.LocationBatchRequest
import com.epm.tracking.data.OfflineRequest
import com.epm.tracking.data.SessionManager
import com.epm.tracking.data.local.AppDatabase
import com.epm.tracking.data.local.entity.LocationEntity
import com.epm.tracking.location.DefaultLocationClient
import com.epm.tracking.location.LocationClient
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import com.epm.tracking.auth.FaceAuthManager

class TrackingService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var locationClient: LocationClient
    private var lastSavedTimestamp: Long = 0L
    private var isAutoVerifying = false

    override fun onBind(p0: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        locationClient = DefaultLocationClient(
            applicationContext,
            LocationServices.getFusedLocationProviderClient(applicationContext)
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> start()
            ACTION_STOP  -> stop()
        }
        return START_STICKY
    }

    private fun start() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "tracking_channel",
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, "tracking_channel")
            .setContentTitle("EPM Tracking")
            .setContentText("Tracking your location...")
            .setSmallIcon(android.R.drawable.sym_def_app_icon)
            .setOngoing(true)

        startForeground(1, notification.build())

        val sessionManager = SessionManager(applicationContext)
        val db = AppDatabase.getDatabase(applicationContext)

        // Fetch dynamic tracking & face verification config from backend on service startup
        serviceScope.launch {
            fetchRemoteConfig(sessionManager)
        }

        val trackingInterval = sessionManager.getTrackingInterval()

        locationClient.getLocationUpdates(trackingInterval)
            .catch { e ->
                e.printStackTrace()
                if (e is com.epm.tracking.location.LocationClient.LocationException) {
                    val updatedNotification = notification.setContentText("⚠️ ${e.message ?: "GPS issue detected"}")
                    notificationManager.notify(1, updatedNotification.build())
                }
            }
            .onEach { location ->
                if (handleGracePeriodCheck(sessionManager)) return@onEach

                handleFaceVerificationCheck(sessionManager, notificationManager, notification)

                if (shouldSkipLocation(location, sessionManager)) return@onEach

                val lat = location.latitude
                val lng = location.longitude
                val currentEmpCode = sessionManager.getEmployeeCode() ?: "EMP001"
                val addressName = reverseGeocodeAddress(lat, lng)

                // 1. Persist to Room DB
                db.locationDao().insertLocation(
                    LocationEntity(
                        employeeCode = currentEmpCode,
                        latitude     = lat,
                        longitude    = lng,
                        accuracy     = location.accuracy,
                        address      = addressName,
                        timestamp    = location.time,
                        isSynced     = false
                    )
                )

                // 2. Immediately try to push to backend server
                serviceScope.launch {
                    syncUnsyncedLocations(db)
                }

                val displayText = if (!addressName.isNullOrBlank()) "📍 $addressName" else "📍 ${"%.5f".format(lat)}, ${"%.5f".format(lng)}"
                val updatedNotification = notification.setContentText(displayText)
                notificationManager.notify(1, updatedNotification.build())
            }
            .launchIn(serviceScope)
    }

    private suspend fun fetchRemoteConfig(sessionManager: SessionManager) {
        try {
            val apiService = ApiClient.getService()
            val config = apiService.getTrackingConfig()
            if (config.trackingIntervalMs > 0) {
                sessionManager.saveTrackingInterval(config.trackingIntervalMs)
            }
            config.faceVerificationIntervalMs?.let {
                sessionManager.saveFaceVerificationInterval(it)
            }
            config.faceVerificationGracePeriodMs?.let {
                sessionManager.saveFaceVerificationGracePeriod(it)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun handleGracePeriodCheck(sessionManager: SessionManager): Boolean {
        if (sessionManager.isGracePeriodExpired()) {
            sessionManager.clearSession()
            val logoutIntent = Intent(ACTION_SESSION_EXPIRED).setPackage(packageName)
            sendBroadcast(logoutIntent)
            stop()
            return true
        }
        return false
    }

    private fun handleFaceVerificationCheck(
        sessionManager: SessionManager,
        notificationManager: NotificationManager,
        notification: NotificationCompat.Builder
    ) {
        if (!sessionManager.isFaceVerificationDue()) return

        sessionManager.startPendingVerificationGracePeriod()

        if (isAutoVerifying) {
            BuzzerManager.playBuzzer(applicationContext)
            return
        }

        isAutoVerifying = true
        serviceScope.launch {
            try {
                performBackgroundFaceVerification(sessionManager, notificationManager, notification)
            } catch (e: Exception) {
                android.util.Log.e("EPM_FACE_LOG", "Background verification process exception", e)
            } finally {
                isAutoVerifying = false
            }
        }
    }

    private suspend fun performBackgroundFaceVerification(
        sessionManager: SessionManager,
        notificationManager: NotificationManager,
        notification: NotificationCompat.Builder
    ) {
        val currentEmpCode = sessionManager.getEmployeeCode() ?: "EMP001"
        android.util.Log.d("EPM_FACE_LOG", "Background face verification due. Triggering silent camera capture...")
        val base64 = BackgroundCameraHelper.captureFaceInBackground(applicationContext)

        if (base64 == null) {
            android.util.Log.e("EPM_FACE_LOG", "Background face capture failed")
            BuzzerManager.playBuzzer(applicationContext)
            val warningNotif = notification.setContentText("⚠️ Face Verification Required! Please open app.")
            notificationManager.notify(1, warningNotif.build())
            return
        }

        android.util.Log.d("EPM_FACE_LOG", "Background photo captured. Querying server face verification for Employee Code: $currentEmpCode")
        val faceAuthManager = FaceAuthManager(applicationContext)
        val response = faceAuthManager.verifyFaceWithServer(currentEmpCode, base64)

        if (response != null && response.match) {
            android.util.Log.i("EPM_FACE_LOG", "Background automatic face verification succeeded! Confidence: ${response.confidence}%")
            sessionManager.recordFaceVerificationSuccess()
            val normalNotif = notification.setContentText("Tracking your location...")
            notificationManager.notify(1, normalNotif.build())
        } else {
            android.util.Log.w("EPM_FACE_LOG", "Background face verification mismatch: ${response?.confidence}% - ${response?.message}")
            BuzzerManager.playBuzzer(applicationContext)
            val warningNotif = notification.setContentText("⚠️ Face Verification Required! Please open app.")
            notificationManager.notify(1, warningNotif.build())
        }
    }

    private fun shouldSkipLocation(location: android.location.Location, sessionManager: SessionManager): Boolean {
        // Filter out low-accuracy locations (> 40m)
        if (location.hasAccuracy() && location.accuracy > 40f) {
            return true
        }

        val activeInterval = sessionManager.getTrackingInterval()
        val now = System.currentTimeMillis()

        // Throttle updates that arrive faster than the active interval
        if (lastSavedTimestamp > 0 && (now - lastSavedTimestamp) < (activeInterval - 5000L)) {
            return true
        }

        lastSavedTimestamp = now
        return false
    }

    private fun reverseGeocodeAddress(lat: Double, lng: Double): String? {
        return try {
            val geocoder = android.location.Geocoder(applicationContext, java.util.Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses = geocoder.getFromLocation(lat, lng, 1)
            if (!addresses.isNullOrEmpty()) {
                val addr = addresses[0]
                addr.getAddressLine(0) ?: "${addr.locality ?: ""}, ${addr.adminArea ?: ""}".trim(',', ' ')
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun syncUnsyncedLocations(db: AppDatabase) {
        try {
            val unsynced = db.locationDao().getUnsyncedLocations()
            if (unsynced.isEmpty()) return

            val batchRequest = unsynced.map { loc ->
                LocationBatchRequest(
                    employeeCode = loc.employeeCode,
                    latitude     = loc.latitude,
                    longitude    = loc.longitude,
                    accuracy     = loc.accuracy,
                    address      = loc.address,
                    timestamp    = loc.timestamp
                )
            }

            val apiService = ApiClient.getService()
            val response = apiService.syncLocations(batchRequest)
            if (response.success) {
                db.locationDao().deleteLocations(unsynced.map { it.id })
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stop() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        val sessionManager = SessionManager(applicationContext)
        val empCode = sessionManager.getEmployeeCode()
        val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
        @Suppress("OPT_IN_USAGE")
        GlobalScope.launch(Dispatchers.IO) {
            try {
                ApiClient.getService().markOffline(OfflineRequest(employeeCode = empCode, deviceId = deviceId))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        serviceScope.cancel()
    }

    companion object {
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP  = "ACTION_STOP"
        const val ACTION_SESSION_EXPIRED = "com.epm.tracking.ACTION_SESSION_EXPIRED"
    }
}
