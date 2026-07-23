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
import kotlinx.coroutines.launch

class TrackingService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var locationClient: LocationClient

    // How often to request a location fix (2 minutes)
    private val trackingInterval = 120000L

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
        return super.onStartCommand(intent, flags, startId)
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

        // Fetch dynamic tracking interval setting from backend on service startup
        serviceScope.launch {
            try {
                val apiService = ApiClient.getService()
                val config = apiService.getTrackingConfig()
                if (config.trackingIntervalMs > 0) {
                    sessionManager.saveTrackingInterval(config.trackingIntervalMs)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        val trackingInterval = sessionManager.getTrackingInterval()

        // Resolve the logged-in user's real ID and device ID
        val userId   = sessionManager.getUserId()
        val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"

        locationClient.getLocationUpdates(trackingInterval)
            .catch { e -> e.printStackTrace() }
            .onEach { location ->
                val lat = location.latitude
                val lng = location.longitude
                val accuracy = location.accuracy
                val timestamp = location.time

                // 1. Persist to local Room DB (survives offline / app kill)
                if (userId != null) {
                    db.locationDao().insertLocation(
                        LocationEntity(
                            userId   = userId,
                            deviceId = deviceId,
                            latitude  = lat,
                            longitude = lng,
                            accuracy  = accuracy,
                            timestamp = timestamp,
                            isSynced  = false
                        )
                    )

                    // 2. Immediately try to push to the backend server
                    serviceScope.launch {
                        try {
                            val apiService = ApiClient.getService()
                            val response = apiService.syncLocations(
                                listOf(
                                    LocationBatchRequest(
                                        deviceId     = deviceId,
                                        mobileUserId = userId,
                                        latitude     = lat,
                                        longitude    = lng,
                                        accuracy  = accuracy,
                                        timestamp = timestamp
                                    )
                                )
                            )
                            // If server accepted it, mark the latest row as synced
                            if (response.success) {
                                val unsynced = db.locationDao().getUnsyncedLocations()
                                if (unsynced.isNotEmpty()) {
                                    db.locationDao().deleteLocations(unsynced.map { it.id })
                                }
                            }
                        } catch (e: Exception) {
                            // Network unavailable — SyncWorker will retry later
                            e.printStackTrace()
                        }
                    }
                }

                // 3. Update notification with live coordinates
                val updatedNotification = notification.setContentText("📍 ${"%.5f".format(lat)}, ${"%.5f".format(lng)}")
                notificationManager.notify(1, updatedNotification.build())
            }
            .launchIn(serviceScope)
    }

    private fun stop() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }

    companion object {
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP  = "ACTION_STOP"
    }
}

