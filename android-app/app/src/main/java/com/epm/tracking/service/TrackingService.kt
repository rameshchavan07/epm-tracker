package com.epm.tracking.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.epm.tracking.R
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

class TrackingService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit val locationClient: LocationClient
    
    // Hardcoded for now. Will be fetched from AppDatabase Config in production
    private val trackingInterval = 10000L 

    override fun onBind(p0: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        locationClient = DefaultLocationClient(
            applicationContext,
            LocationServices.getFusedLocationProviderClient(applicationContext)
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when(intent?.action) {
            ACTION_START -> start()
            ACTION_STOP -> stop()
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
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)

        startForeground(1, notification.build())

        locationClient.getLocationUpdates(trackingInterval)
            .catch { e -> e.printStackTrace() }
            .onEach { location ->
                val lat = location.latitude
                val long = location.longitude
                
                // Save to Room DB
                val db = AppDatabase.getDatabase(applicationContext)
                db.locationDao().insertLocation(
                    LocationEntity(
                        userId = "current_user_id", // Mocked for now
                        deviceId = "device_id",     // Mocked for now
                        latitude = lat,
                        longitude = long,
                        accuracy = location.accuracy,
                        timestamp = location.time
                    )
                )
                
                // Update notification text (optional, but good for debugging)
                val updatedNotification = notification.setContentText("Location: ($lat, $long)")
                notificationManager.notify(1, updatedNotification.build())
            }
            .launchIn(serviceScope)
    }

    private fun stop() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }

    companion object {
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
    }
}
