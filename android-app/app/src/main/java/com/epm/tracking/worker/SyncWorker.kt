package com.epm.tracking.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import android.provider.Settings
import com.epm.tracking.data.ApiClient
import com.epm.tracking.data.LocationBatchRequest
import com.epm.tracking.data.SessionManager
import com.epm.tracking.data.local.AppDatabase

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val sessionManager = SessionManager(applicationContext)

        val deviceId = Settings.Secure.getString(applicationContext.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"

        return try {
            val unsyncedLocations = database.locationDao().getUnsyncedLocations()
            if (unsyncedLocations.isEmpty()) {
                return Result.success()
            }

            val apiService = ApiClient.getService(sessionManager)
            val batchRequest = unsyncedLocations.map { loc ->
                LocationBatchRequest(
                    deviceId  = loc.deviceId.ifEmpty { deviceId },
                    userId    = loc.userId,
                    latitude  = loc.latitude,
                    longitude = loc.longitude,
                    accuracy  = loc.accuracy,
                    timestamp = loc.timestamp
                )
            }

            val response = apiService.syncLocations(batchRequest)
            if (response.success) {
                // Delete rows that were successfully uploaded
                database.locationDao().deleteLocations(unsyncedLocations.map { it.id })
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Result.retry()
        }
    }
}
